import React, {useState, useEffect} from "react"
import CopyToClipboard from 'react-copy-to-clipboard'
import Swal from "sweetalert2"
import {
    Image,
    Button,
    Card,
    FormControl,
} from 'react-bootstrap'

import NETWORK from '../network'
import imageSrc from '../assets/lab_cover.png'


interface MainProps {
    location: any
}

function MainView(props: MainProps) {
    const [message, setMessage] = useState('')
    const [userInput, setUserInput] = useState('')
    const [isCopied, setIsCopied] = useState(false)

    const params = new URLSearchParams(props.location.search)
    const labMlToken = params.get('labml_token')

    useEffect(() => {
        if (labMlToken) {
            setMessage(`${process.env.REACT_APP_SERVER_URL}/track?labml_token=${labMlToken}`)
        }
    }, [labMlToken]);

    const onSubmit = () => {
        if (userInput) {
            window.location.href = `/runs?labml_token=${userInput}`;
        } else {
            NETWORK.authorize().then((res) => {
                window.location.href = res.data.uri;
            }).catch((error) => {
                Swal.fire('Authorization Failed!', `${error}`, 'error');
            })
        }
    }

    const handleTokenChange = (e: any) => {
        setUserInput(e.target.value)
    }

    return <div>
        <div className={"container-sm text-center mb-3"}>
            <h2>Get Model Training Updates in Mobile</h2>
            <h5 className={"text-secondary"}>An open-source library to push updates of your ML/DL model training to
                mobile</h5>
            <Image src={imageSrc} rounded/>
            <div className={"w-75 mx-auto"}>
                {labMlToken
                    ? <Card>
                        <Card.Body>
                            <Card.Title><h5>Your web_api URL is</h5></Card.Title>
                            <Card.Text>
                                <h6 className={"text-secondary"}>{message}</h6>
                            </Card.Text>
                            <CopyToClipboard text={message} onCopy={() => setIsCopied(true)}>
                                <Button className={"button-theme"}> {isCopied ? 'URL Copied' : 'Copy URL'}</Button>
                            </CopyToClipboard>
                        </Card.Body>
                    </Card>
                    :
                    <div className={"w-50 mx-auto"}>
                        <FormControl type='text' placeholder="If you already have generated a LabMLToken, enter here"
                                     onChange={handleTokenChange}/>
                        <Button className={"mt-3 button-theme"} onClick={onSubmit}>
                            Try it Out
                        </Button>
                    </div>
                }
            </div>
        </div>
        <div>
            <div className={"text-center"}>
                <a href={'https://github.com/lab-ml/labml'}>LabML Github Repo</a>
                <span> | </span>
                <a href={'https://github.com/lab-ml/app'}>LabML App Github Repo</a>
                <span> | </span>
                <a href="https://join.slack.com/t/labforml/shared_invite/zt-egj9zvq9-Dl3hhZqobexgT7aVKnD14g/">Slack
                    Workspace for discussion</a>
            </div>
        </div>
    </div>
}

export default MainView