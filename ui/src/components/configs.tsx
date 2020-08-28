import React, {ReactElement} from "react";
import "./configs.scss"
import {FormattedValue} from "./value";

const CONFIG_PRINT_LEN = 20

export interface Config {
    key: string
    name: string
    computed: any
    value: any
    options: string[]
    order: number
    type: string
    is_hyperparam?: boolean
    is_meta?: boolean
    is_explicitly_specified?: boolean
}


function ComputedValue(props: { computed: any }) {
    if (typeof props.computed !== 'string') {
        return <span className={'computed'}>
            <FormattedValue value={props.computed}/>
        </span>
    }

    let computed: string = props.computed
    computed = computed.replace('\n', '')
    if (computed.length < CONFIG_PRINT_LEN) {
        return <span className={'computed'}>{computed}</span>
    }

    let truncated = computed.substr(0, CONFIG_PRINT_LEN) + '...'
    let split = computed.split('.')
    if (computed.indexOf(' ') === -1 && split.length > 1) {
        truncated = '...' + split[split.length - 1]
        if (truncated.length > CONFIG_PRINT_LEN) {
            truncated = truncated.substr(0, CONFIG_PRINT_LEN) + '...'
        }
    }

    return <span className={'computed'}>
        <span title={computed}>{truncated}</span>
    </span>
}

function Option(props: { value: any }) {
    return <span className={'option'}>{props.value}</span>
}

function OtherOptions(props: { options: any[] }) {
    let options = props.options
    if (options.length === 0) {
        return null
    }

    return <span className={'options'}>
        {options
            .filter((o => typeof o === 'string'))
            .map((o) => <span key={o}>{o}</span>)
        }
    </span>
}

interface OptionInfo {
    isCustom: boolean
    isOnlyOption: boolean
    value: string
    isDefault: boolean
    otherOptions?: ReactElement
}


function parseOption(conf: Config): OptionInfo {
    let options = new Set()
    for (let opt of conf.options) {
        options.add(opt)
    }

    let res: OptionInfo = {
        isCustom: false,
        isOnlyOption: false,
        value: conf.value,
        isDefault: false
    }

    if (options.has(conf.value)) {
        options.delete(conf.value)
        if (options.size === 0) {
            res.isOnlyOption = true
            res.isDefault = true
        }
    } else {
        res.isCustom = true
        if (conf.is_explicitly_specified !== true) {
            res.isDefault = true
        }
    }
    if (options.size > 0) {
        res.otherOptions = <OtherOptions options={[...options]}/>
    }

    return res
}

function ConfigItemView(props: { config: Config, configs: Config[] }) {
    let conf = props.config
    let configs: { [key: string]: Config } = {}
    for (let c of props.configs) {
        configs[c.key] = c
    }

    let isCollapsible = false
    let classes = ['info_list config']

    let computedElem = null
    let optionElem = null
    let otherOptionsElem = null

    let prefix = ''
    let parentKey = ''
    let isParentDefault = false
    let conf_modules = conf.key.split('.')
    for (let i = 0; i < conf_modules.length - 1; ++i) {
        parentKey += conf_modules[i]
        let optInfo = parseOption(configs[parentKey])
        if (optInfo.isDefault) {
            isParentDefault = true
        }
        parentKey += '.'
        prefix += '--- '
    }

    if (conf.order < 0) {
        classes.push('ignored')
        isCollapsible = true
    } else {
        computedElem = <ComputedValue computed={conf.computed}/>

        let options = parseOption(conf)

        if (options.isCustom) {
            if (isParentDefault && !conf.is_explicitly_specified && !conf.is_hyperparam && !conf.is_hyperparam) {
                classes.push('.only_option')
                isCollapsible = true
            } else {
                classes.push('.custom')
            }
        } else {
            optionElem = <Option value={conf.value}/>
            if (!conf.is_explicitly_specified && !conf.is_hyperparam && (isParentDefault || options.isOnlyOption)) {
                classes.push('.only_option')
                isCollapsible = true
            } else {
                classes.push('.picked')
            }
        }

        otherOptionsElem = options.otherOptions

        if (conf.is_hyperparam) {
            classes.push('hyperparam')
        } else if (conf.is_explicitly_specified) {
            classes.push('specified')
        } else {
            classes.push('not-hyperparam')
        }
    }

    if (conf.is_meta) {
        return null
    }

    if (isCollapsible) {
        return null
        // classes.push('collapsible')
    } else {
        classes.push('not_collapsible')
    }

    return <div className={classes.join(' ')}>
        <span className={'key'}>{prefix + conf.name}</span>
        <span className={'combined'}>
        {computedElem}
            {optionElem}
            {/*{otherOptionsElem}*/}
        </span>
    </div>
}

export function ConfigsView(props: { configs: Config[] }) {
    let configs = props.configs

    configs.sort((a, b) => {
        if (a.key < b.key) return -1;
        else if (a.key > b.key) return +1;
        else return 0
    })

    return <div className={"configs block collapsed"}>
        {configs.map((c) => <ConfigItemView key={c.key} config={c} configs={configs}/>)}
    </div>
}
