import sys
import typing
from typing import Any

import flask
import werkzeug.wrappers
from flask import jsonify, request, make_response

from .analyses import AnalysisManager
from . import settings
from .auth import login_required, check_labml_token_permission, get_session, get_auth_user, get_is_user_logged
from .db import run
from .db import computer
from .db import session
from .db import user
from .db import project
from .logging import logger
from .utils import check_version

request = typing.cast(werkzeug.wrappers.Request, request)


def sign_in() -> flask.Response:
    u = user.get_or_create_user(user.AuthOInfo(**request.json))

    session_id = request.cookies.get('session_id')
    s = session.get_or_create(session_id)

    s.user = u.key
    s.save()

    response = make_response(jsonify({'is_successful': True}))

    if session_id != s.session_id:
        response.set_cookie('session_id', s.session_id)

    logger.debug(f'sign_in, user: {u.key}')

    return response


def sign_out() -> flask.Response:
    session_id = request.cookies.get('session_id')
    s = session.get_or_create(session_id)

    session.delete(s)

    response = make_response(jsonify({'is_successful': True}))

    if session_id != s.session_id:
        response.set_cookie('session_id', s.session_id)

    logger.debug(f'sign_out, session_id: {s.session_id}')

    return response


def update_computer() -> flask.Response:
    errors = []

    token = request.args.get('labml_token', '')
    # TODO change this in client
    computer_uuid = request.args.get('computer_uuid', '')

    c = computer.get_or_create(computer_uuid, token, request.remote_addr)
    s = c.status.load()

    c.update_computer(request.json)
    s.update_time_status(request.json)
    # TODO change this in client
    if 'track' in request.json:
        AnalysisManager.track_computer(computer_uuid, request.json['track'])

    return jsonify({'errors': errors, 'url': c.url})


@login_required
def get_computer(computer_uuid: str) -> flask.Response:
    computer_data = {}
    status_code = 400

    c = computer.get_computer(computer_uuid)
    if c:
        computer_data = c.get_data()
        status_code = 200

    response = make_response(jsonify(computer_data))
    response.status_code = status_code

    logger.debug(f'computer, computer_uuid: {computer_uuid}')

    return response


@login_required
@check_labml_token_permission
def get_computers(labml_token: str) -> flask.Response:
    u = get_auth_user()

    if labml_token:
        computers_list = computer.get_computers(labml_token)
    else:
        default_project = u.default_project
        labml_token = default_project.labml_token
        computers_list = default_project.get_computers()

    res = []
    for c in computers_list:
        s = computer.get_status(c.computer_uuid)
        if c.computer_uuid:
            res.append({**c.get_summary(), **s.get_data()})

    res = sorted(res, key=lambda i: i['start_time'], reverse=True)

    logger.debug(f'computers, labml_token : {labml_token}')

    return jsonify({'computers': res, 'labml_token': labml_token})


def update_run() -> flask.Response:
    errors = []

    token = request.args.get('labml_token', '')
    version = request.args.get('labml_version', '')
    run_uuid = request.args.get('run_uuid', '')

    if len(run_uuid) < 10:
        error = {'error': 'invalid_run_uuid',
                 'message': f'Invalid Run UUID'}
        errors.append(error)
        return jsonify({'errors': errors})

    if check_version(version, settings.LABML_VERSION):
        error = {'error': 'labml_outdated',
                 'message': f'Your labml client is outdated, please upgrade: '
                            'pip install labml --upgrade'}
        errors.append(error)
        return jsonify({'errors': errors})

    p = project.get_project(labml_token=token)
    if not p:
        token = settings.FLOAT_PROJECT_TOKEN

    r = run.get(run_uuid, token)
    if not r and not p:
        if request.args.get('labml_token', ''):
            error = {'error': 'invalid_token',
                     'message': 'Please create a valid token at https://web.lab-ml.com.\n'
                                'Click on the experiment link to monitor the experiment and '
                                'add it to your experiments list.'}
        else:
            error = {'warning': 'empty_token',
                     'message': 'Please create a valid token at https://web.lab-ml.com.\n'
                                'Click on the experiment link to monitor the experiment and '
                                'add it to your experiments list.'}
        errors.append(error)

    r = run.get_or_create(run_uuid, token, request.remote_addr)
    s = r.status.load()

    r.update_run(request.json)
    s.update_time_status(request.json)
    if 'track' in request.json:
        AnalysisManager.track(run_uuid, request.json['track'])

    logger.debug(f'update_run, run_uuid: {run_uuid}, size : {sys.getsizeof(str(request.json)) / 1024} Kb')

    return jsonify({'errors': errors, 'url': r.url})


def claim_run(run_uuid: str, r: run.Run) -> None:
    s = get_session()

    if not s.user:
        return

    default_project = s.user.load().default_project

    if run_uuid not in default_project.runs:
        float_project = project.get_project(labml_token=settings.FLOAT_PROJECT_TOKEN)

        if run_uuid in float_project.runs:
            default_project.runs[run_uuid] = r.key
            default_project.save()
            r.is_claimed = True
            r.save()


def get_run(run_uuid: str) -> flask.Response:
    run_data = {}
    status_code = 400

    r = run.get_run(run_uuid)
    if r:
        run_data = r.get_data()
        status_code = 200

        if not r.is_claimed:
            claim_run(run_uuid, r)

    response = make_response(jsonify(run_data))
    response.status_code = status_code

    logger.debug(f'run, run_uuid: {run_uuid}')

    return response


def get_run_status(run_uuid: str) -> flask.Response:
    status_data = {}
    status_code = 400

    s = run.get_status(run_uuid)
    if s:
        status_data = s.get_data()
        status_code = 200

    response = make_response(jsonify(status_data))
    response.status_code = status_code

    logger.debug(f'run_status, run_uuid: {run_uuid}')

    return response


def get_computer_status(computer_uuid: str) -> flask.Response:
    status_data = {}
    status_code = 400

    s = computer.get_status(computer_uuid)
    if s:
        status_data = s.get_data()
        status_code = 200

    response = make_response(jsonify(status_data))
    response.status_code = status_code

    logger.debug(f'computer_status, computer_uuid: {computer_uuid}')

    return response


@login_required
@check_labml_token_permission
def get_runs(labml_token: str) -> flask.Response:
    u = get_auth_user()

    if labml_token:
        runs_list = run.get_runs(labml_token)
    else:
        default_project = u.default_project
        labml_token = default_project.labml_token
        runs_list = default_project.get_runs()

    res = []
    for r in runs_list:
        s = run.get_status(r.run_uuid)
        if r.run_uuid:
            res.append({**r.get_summary(), **s.get_data()})

    res = sorted(res, key=lambda i: i['start_time'], reverse=True)

    logger.debug(f'runs, labml_token : {labml_token}')

    return jsonify({'runs': res, 'labml_token': labml_token})


@login_required
def delete_runs():
    run_uuids = request.json['run_uuids']

    u = get_auth_user()
    u.default_project.delete_runs(run_uuids)

    return jsonify({'is_successful': True})


@login_required
def get_user() -> Any:
    u = get_auth_user()
    logger.debug(f'get_user, user : {u.key}')

    return jsonify(u.get_data())


def is_user_logged() -> Any:

    return jsonify({'is_user_logged': get_is_user_logged()})


def _add_server(app: flask.Flask, method: str, func: typing.Callable, url: str):
    app.add_url_rule(f'/api/v1/{url}', view_func=func, methods=[method])


def _add_ui(app: flask.Flask, method: str, func: typing.Callable, url: str):
    app.add_url_rule(f'/api/v1/{url}', view_func=func, methods=[method])


def add_handlers(app: flask.Flask):
    _add_server(app, 'POST', update_run, 'track')
    _add_server(app, 'POST', update_computer, 'computer')

    _add_ui(app, 'GET', get_runs, 'runs/<labml_token>')
    _add_ui(app, 'GET', get_computers, 'computers/<labml_token>')
    _add_ui(app, 'PUT', delete_runs, 'runs')
    _add_ui(app, 'GET', get_user, 'user')

    _add_ui(app, 'GET', get_run, 'run/<run_uuid>')
    _add_ui(app, 'GET', get_computer, 'computer/<computer_uuid>')
    _add_ui(app, 'GET', get_run_status, 'run/status/<run_uuid>')
    _add_ui(app, 'GET', get_computer_status, 'computer/status/<computer_uuid>')

    _add_ui(app, 'POST', sign_in, 'auth/sign_in')
    _add_ui(app, 'DELETE', sign_out, 'auth/sign_out')
    _add_ui(app, 'GET', is_user_logged, 'auth/is_logged')

    for method, func, url in AnalysisManager.get_handlers():
        _add_ui(app, method, func, url)
