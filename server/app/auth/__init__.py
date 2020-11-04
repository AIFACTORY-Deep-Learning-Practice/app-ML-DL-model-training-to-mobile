import functools
import typing

import werkzeug.wrappers
from flask import request, make_response

from ..db import session
from ..db import user

request = typing.cast(werkzeug.wrappers.Request, request)


def get_session() -> session.Session:
    session_id = request.cookies.get('session_id')

    return session.get_or_create(session_id)


def check_labml_token_permission(func) -> functools.wraps:
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        labml_token = kwargs.get('labml_token', '')

        p = user.get_project(labml_token)
        if p and p.is_sharable:
            return func(*args, **kwargs)

        kwargs['labml_token'] = None

        return func(*args, **kwargs)

    return wrapper


def login_required(func) -> functools.wraps:
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        session_id = request.cookies.get('session_id')
        s = session.get_or_create(session_id)
        if s.is_auth:
            return func(*args, **kwargs)
        else:
            response = make_response()
            response.status_code = 403

            if session_id != s.session_id:
                response.set_cookie('session_id', s.session_id)

            return response

    return wrapper
