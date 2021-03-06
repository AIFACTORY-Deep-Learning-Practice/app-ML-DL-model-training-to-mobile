import React from "react"

import {Alert} from "react-bootstrap"

import "./alert.scss"

interface MessageProps {
    children: any
    onClick?: () => void
}

export function WarningMessage(props: MessageProps) {
    let cursor = props.onClick ? ' cursor' : ''
    return <Alert className={'text-center mt-1 alert-message text-info' + cursor} variant={'warning'}
                  onClick={props.onClick}>
        {props.children}
    </Alert>
}

export function ErrorMessage(props: MessageProps) {
    return <Alert className={'text-center mt-1 alert-message text-info'} variant={'danger'}>
        {props.children}
    </Alert>
}

