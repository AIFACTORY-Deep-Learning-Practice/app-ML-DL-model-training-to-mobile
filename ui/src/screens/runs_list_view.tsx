import React, {useEffect, useState} from "react"
import {useHistory} from "react-router-dom";

import {Alert} from "react-bootstrap"
import NETWORK from '../network'
import {RunsList} from "../components/runs_list"
import {Code} from "../components/code"
import {LabLoader} from "../components/loader"
import {Run} from "../components/models"


interface RunsListProps {
    location: any
}

function RunsListView(props: RunsListProps) {
    const history = useHistory();
    const [isLoading, setIsLoading] = useState(true)
    const [networkError, setNetworkError] = useState(null)
    const [runs, setRuns] = useState<Run[]>([])
    const [isValidUser, setIsValidUser] = useState(null)

    const params = new URLSearchParams(props.location.search)
    const labMlToken = params.get('labml_token')


    useEffect(() => {
        if (labMlToken) {
            NETWORK.get_runs(labMlToken)
                .then((res) => {
                    if (res) {
                        setRuns(res.data.runs)
                        setIsValidUser(res.data.is_valid_user)
                        setIsLoading(false)
                    }
                })
                .catch((err) => {
                    setNetworkError(err.message)
                })
        }
    }, [labMlToken])

    useEffect(() => {
        document.title = "LabML: Runs list"
    }, [labMlToken])

    return <div>
        {(() => {
            if (networkError != null) {
                return <Alert variant={'danger'}>{networkError}</Alert>
            } else if (isLoading) {
                return <LabLoader isLoading={isLoading}/>
            } else if (!isValidUser) {
                history.push(`/404`)
            } else if (runs.length === 0) {
                return <Code labMlToken={labMlToken}/>
            } else {
                return <RunsList runs={runs}/>
            }
        })()}
    </div>
}

export default RunsListView