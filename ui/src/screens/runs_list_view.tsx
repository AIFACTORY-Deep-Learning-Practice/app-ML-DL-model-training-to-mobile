import React, {useEffect, useRef, useState} from "react"

import {FontAwesomeIcon} from "@fortawesome/react-fontawesome"
import {faSearch} from "@fortawesome/free-solid-svg-icons"

import {RunsList} from "../components/lists/runs_list"
import {EmptyRunsList} from "../components/lists/empty_runs_list"
import {LabLoader} from "../components/utils/loader"
import {RunListItemModel} from "../models/run_list"
import CACHE from "../cache/cache"

import './runs_list_view.scss'


function RunsListView() {
    const [isLoading, setIsLoading] = useState(true)
    const [runs, setRuns] = useState<RunListItemModel[]>([])
    const [labMlToken, setLabMlToken] = useState('')

    const runListCache = CACHE.getRunsList()
    const inputElement = useRef(null) as any

    useEffect(() => {
        async function load() {
            let currentRunsList = await runListCache.getRunsList(null)
            if (currentRunsList) {
                setRuns(currentRunsList.runs)
                setLabMlToken(currentRunsList.labml_token)
                setIsLoading(false)
            }
        }

        load().then()
    }, [runListCache])


    useEffect(() => {
        document.title = "LabML: Experiments"
    }, [labMlToken])

    function runsFilter(run: RunListItemModel, search: string) {
        let re = new RegExp(search.toLowerCase(), "g")
        let name = run.name.toLowerCase()
        let comment = run.comment.toLowerCase()

        return (name.search(re) !== -1 || comment.search(re) !== -1)
    }

    function handleChannelChange() {
        async function load() {
            if (inputElement.current) {
                let search = inputElement.current.value
                let currentRunsList = await runListCache.getRunsList(null)
                let currentRuns = currentRunsList.runs

                currentRuns = currentRuns.filter((run) => runsFilter(run, search))
                setRuns(currentRuns)
            }
        }

        load().then()
    }

    function onDelete(runsSet: Set<string>) {
        let res: RunListItemModel[] = []
        for (let run of runs) {
            if (!runsSet.has(run.run_uuid)) {
                res.push(run)
            }
        }

        setRuns(res)
        runListCache.deleteRuns(res, Array.from(runsSet)).then()
    }

    async function load() {
        let currentRunsList = await runListCache.getRunsList(null, true)
        if (currentRunsList) {
            setRuns(currentRunsList.runs)
        }
    }

    function onRefresh() {
        load().then()
    }

    return <div>
        {(() => {
            if (isLoading) {
                return <LabLoader/>
            } else if (inputElement.current === null && runs.length === 0) {
                return <EmptyRunsList/>
            } else {
                return <div className={'runs-list'}>
                    {/*TODO: Change later to simple html & css*/}
                    <div className={"search-container mt-3 mb-2 px-2"}>
                        <div className={"search-content"}>
                            <span className={'icon'}>
                                <FontAwesomeIcon icon={faSearch}/>
                            </span>
                            <input
                                ref={inputElement}
                                onChange={handleChannelChange}
                                type={"search"}
                                placeholder={"Search"}
                                aria-label="Search"
                            />
                        </div>
                    </div>
                    <RunsList runs={runs} onDelete={onDelete} onRefresh={onRefresh}/>
                </div>
            }
        })()}
    </div>
}

export default RunsListView