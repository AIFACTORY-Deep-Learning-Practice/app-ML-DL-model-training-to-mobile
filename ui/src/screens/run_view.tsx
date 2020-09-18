import React, {useEffect, useState} from "react"

import "./run_view.scss"
import NETWORK from '../network'
import {ConfigsView} from "../components/configs";
import LineChart, {SeriesModel} from "../components/chart";
import useWindowDimensions from "../utils/window_dimensions";
import {RunInfo} from "../components/run_info";
import {LabLoader} from "../components/loader"
import {Alert} from "react-bootstrap";


interface RunProps {
    location: any
}

function RunView(props: RunProps) {
    const [isTrackLoading, setIsTrackLoading] = useState(true)
    const [isRunLoading, setIsRunLoading] = useState(true)
    const [networkError, setNetworkError] = useState(null)

    const [run, setRun] = useState({
        run_uuid: '',
        name: '',
        comment: '',
        configs: [],
        start: Number.NaN,
        time: Number.NaN,
        status: {
            status: '',
            details: '',
            time: Number.NaN
        }
    })
    const {width: windowWidth} = useWindowDimensions()
    const [track, setTrack] = useState(null as unknown as SeriesModel[])

    const params = new URLSearchParams(props.location.search)
    const run_uuid = params.get('run_uuid')

    const actualWidth = Math.min(800, windowWidth)

    useEffect(() => {
        if (run.name.trim() != null) {
            document.title = `LabML: ${run.name.trim()}`
        } else {
            document.title = 'LabML'
        }
    }, [run])

    useEffect(() => {
        function loadFromServer(run_uuid: string) {
            console.log("Try")
            if (run.status.status !== '' && run.status.status !== 'running') {
                console.log("duh")
                return
            }

            NETWORK.get_run(run_uuid)
                .then((res) => {
                    setRun(res.data)
                    setIsRunLoading(false)
                })
                .catch((err) => {
                    setNetworkError(err.message)
                })
            NETWORK.get_tracking(run_uuid)
                .then((res) => {
                    setTrack(res.data)
                    setIsTrackLoading(false)
                })
                .catch((err) => {
                    setNetworkError(err.message)
                })
        }

        let interval: number = 0
        if (run_uuid) {
            loadFromServer(run_uuid)
            let interval = setInterval(() => {
                loadFromServer(run_uuid);
            }, 2 * 60 * 1000);
        }
        return () => clearInterval(interval);
    }, [run_uuid]);

    let runView = <div>
        <RunInfo uuid={run.run_uuid}
                 name={run.name} comment={run.comment}
                 start={run.start} lastUpdatedTime={run.time}
                 status={run.status}/>
        <ConfigsView configs={run.configs} width={actualWidth}/>
    </div>

    let chart = null
    if (track != null && track.length > 0) {
        chart = <LineChart key={1} series={track as SeriesModel[]} width={actualWidth}/>
    }

    let style = {
        width: actualWidth
    }
    return <div>
        {(() => {
            if (networkError != null) {
                return <Alert variant={'danger'}>{networkError}</Alert>
            } else if (isRunLoading || isTrackLoading) {
                return <LabLoader isLoading={true}/>
            } else {
                return <div className={'run'} style={style}>
                    {runView}
                    {chart}
                    <div className={'footer-copyright text-center'}>
                        <a href={'https://github.com/lab-ml/labml'}>LabML Github Repo</a>
                        <span> | </span>
                        <a href={'https://github.com/lab-ml/app'}>LabML App Github Repo</a>
                    </div>
                </div>
            }
        })()}
    </div>

}

export default RunView