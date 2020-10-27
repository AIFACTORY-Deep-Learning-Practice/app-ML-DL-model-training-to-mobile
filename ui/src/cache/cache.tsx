import NETWORK from "../network";
import {Run, RunModel, SeriesModel, Status, StatusModel} from "../models/run";

const TRACKING_TIMEOUT = 60 * 1000

class BroadcastPromise<T> {
    private isLoading: boolean;
    private resolvers: any[]
    private rejectors: any[]

    constructor() {
        this.isLoading = false
        this.resolvers = []
        this.rejectors = []
    }

    private add(resolve: (value: T) => void, reject: (err: any) => void) {
        this.resolvers.push(resolve)
        this.rejectors.push(reject)
    }

    create(load: () => Promise<T>): Promise<T> {
        let promise = new Promise<T>((resolve, reject) => {
            this.add(resolve, reject)
        })

        if (!this.isLoading) {
            this.isLoading = true
            load().then((res) => {
                this.resolve(res)
            }).catch((err) => {
                this.reject(err)
            })
        }

        return promise
    }

    private resolve(value: T) {
        this.isLoading = false
        let resolvers = this.resolvers
        this.resolvers = []
        this.rejectors = []

        for (let r of resolvers) {
            r(value)
        }
    }

    private reject(err: any) {
        this.isLoading = false
        let rejectors = this.rejectors
        this.resolvers = []
        this.rejectors = []

        for (let r of rejectors) {
            r(err)
        }
    }
}

class RunCache {
    private uuid: string
    private lastUpdated: number
    private run!: Run
    private status!: Status
    private metricsTracking!: SeriesModel[]
    private gradsTracking!: SeriesModel[]
    private paramsTracking!: SeriesModel[]
    private modulesTracking!: SeriesModel[]
    private timesTracking!: SeriesModel[]
    private runPromise = new BroadcastPromise<RunModel>()
    private metricsTrackingPromise = new BroadcastPromise<SeriesModel[]>()
    private gradsTrackingPromise = new BroadcastPromise<SeriesModel[]>()
    private paramsTrackingPromise = new BroadcastPromise<SeriesModel[]>()
    private modulesTrackingPromise = new BroadcastPromise<SeriesModel[]>()
    private timesTrackingPromise = new BroadcastPromise<SeriesModel[]>()
    private statusPromise = new BroadcastPromise<StatusModel>()

    constructor(uuid: string) {
        this.uuid = uuid
        this.lastUpdated = 0
    }

    private async loadRun(): Promise<RunModel> {
        return this.runPromise.create(async () => {
            let res = await NETWORK.get_run(this.uuid)
            return res.data
        })
    }

    private async loadStatus(): Promise<StatusModel> {
        return this.statusPromise.create(async () => {
            let res = await NETWORK.get_status(this.uuid)
            return res.data
        })
    }

    private async loadMetricsTracking(): Promise<SeriesModel[]> {
        return this.metricsTrackingPromise.create(async () => {
            let res = await NETWORK.get_metrics_tracking(this.uuid)
            return res.data
        })
    }

    private async loadGradsTracking(): Promise<SeriesModel[]> {
        return this.gradsTrackingPromise.create(async () => {
            let res = await NETWORK.get_grads_tracking(this.uuid)
            return res.data
        })
    }

    private async loadParamsTracking(): Promise<SeriesModel[]> {
        return this.paramsTrackingPromise.create(async () => {
            let res = await NETWORK.get_params_tracking(this.uuid)
            return res.data
        })
    }

    private async loadModulesTracking(): Promise<SeriesModel[]> {
        return this.modulesTrackingPromise.create(async () => {
            let res = await NETWORK.get_modules_tracking(this.uuid)
            return res.data
        })
    }

    private async loadTimesTracking(): Promise<SeriesModel[]> {
        return this.timesTrackingPromise.create(async () => {
            let res = await NETWORK.get_times_tracking(this.uuid)
            return res.data
        })
    }

    async getRun(): Promise<Run> {
        if (this.run == null) {
            this.run = new Run(await this.loadRun())
        }

        return this.run
    }

    async setRun(run: Run): Promise<Run> {
        this.run = run
        await NETWORK.update_run(run.preferences, run.uuid)

        return run
    }

    async getStatus(): Promise<Status> {
        if (this.status == null) {
            this.status = new Status(await this.loadStatus())
        }

        return this.status
    }

    private isTrackingTimeOut(): boolean {
        return (new Date()).getTime() - this.lastUpdated > TRACKING_TIMEOUT
    }

    async getMetricsTracking(): Promise<SeriesModel[]> {
        if (this.metricsTracking == null || (this.status.isRunning && this.isTrackingTimeOut())) {
            this.metricsTracking = await this.loadMetricsTracking()
            this.lastUpdated = (new Date()).getTime()
            this.status = new Status(await this.loadStatus())
        }

        return this.metricsTracking
    }

    async getGradsTracking(): Promise<SeriesModel[]> {
        if (this.gradsTracking == null || (this.status.isRunning && this.isTrackingTimeOut())) {
            this.gradsTracking = await this.loadGradsTracking()
            this.lastUpdated = (new Date()).getTime()
            this.status = new Status(await this.loadStatus())
        }

        return this.gradsTracking
    }

    async getParamsTracking(): Promise<SeriesModel[]> {
        if (this.paramsTracking == null || (this.status.isRunning && this.isTrackingTimeOut())) {
            this.paramsTracking = await this.loadParamsTracking()
            this.lastUpdated = (new Date()).getTime()
            this.status = new Status(await this.loadStatus())
        }

        return this.paramsTracking
    }

    async getModulesTracking(): Promise<SeriesModel[]> {
        if (this.modulesTracking == null || (this.status.isRunning && this.isTrackingTimeOut())) {
            this.modulesTracking = await this.loadModulesTracking()
            this.lastUpdated = (new Date()).getTime()
            this.status = new Status(await this.loadStatus())
        }

        return this.modulesTracking
    }

    async getTimesTracking(): Promise<SeriesModel[]> {
        if (this.timesTracking == null || (this.status.isRunning && this.isTrackingTimeOut())) {
            this.timesTracking = await this.loadTimesTracking()
            this.lastUpdated = (new Date()).getTime()
            this.status = new Status(await this.loadStatus())
        }

        return this.timesTracking
    }
}

class Cache {
    private readonly runs: { [uuid: string]: RunCache }

    constructor() {
        this.runs = {}
    }

    get(uuid: string) {
        if (this.runs[uuid] == null) {
            this.runs[uuid] = new RunCache(uuid)
        }

        return this.runs[uuid]
    }
}

export default new Cache()
