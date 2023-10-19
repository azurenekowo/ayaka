const path = require('path')
const fs = require('fs-extra')
const chalk = require('chalk')
const express = require('express')
const config = require('./config.json')
const { spawn, exec } = require('child_process')

const ui = express()
ui.use(express.json())
ui.use(express.urlencoded({ extended: true }))
ui.use('/static', express.static('resources'))

// Checks for FFMPEG and GI-Cutscenes
exec(`${config.prerequisites.ffmpeg == 'path' ? 'ffmpeg': config.prerequisites.ffmpeg} -version`,
    { shell: 'powershell.exe' }, async (stdout, stderr, error) => {
        const output = (stderr != 'Error: Command failed: ffmpeg -version' ? stderr : null)
        if (output) {
            const version = output.match(/[0-9]{4}-[0-9]{2}-[0-9]{2}(-git-.{10})?/i)[0]
            console.log('[' + chalk.greenBright('Success') + '] Found FFMPEG binary in ' + chalk.grey('%path%') + ', version ' + chalk.grey(version))
        }
        else {
            console.log('[' + chalk.redBright('Error') + '] Couldn\'t find FFMPEG binary in ' + chalk.grey('%path%'))
            process.exit(1)
        }
    }
)
exec(`${config.prerequisites.gicutscenes ? config.prerequisites.gicutscenes : '.\GICutscenes.exe'} --version`,
    { shell: 'powershell.exe' }, async (stdout, stderr, error) => {
        const output = (stderr ? stderr : null)
        if (output) {
            console.log('[' + chalk.greenBright('Success') + '] Found GI-Cutscenes binary, version ' + chalk.grey(output))
            initUI()
        }
        else {
            console.log('[' + chalk.redBright('Error') + '] Couldn\'t find GI-Cutscenes binary.')
            process.exit(1)
        }
    }
)

// Init variables that will be used later
const filesList = []
let filesToDemux = []
let optAudioTrack = ''
let optSubtitlesLang = ''
let optFFmpegArgs = ''

function initUI() {

    ui.listen(2809, async () => {
        console.log(chalk.greenBright('UI started!'))
        console.log(('Access ' + chalk.grey('http://localhost:2809') + ' on your browser to get started.\n'))
    })

    ui.get('/', async (request, response) => {
        response.send(
            fs.readFileSync('ui/index.html')
            .toString()
            .replace('$outdir', config.output)
            .replace('$ffmpegflags', config.defaultFFMPEGFlags) 
            .replace(/\$usminpdir/g, config.optionUSMFilesDir)
        )
    })

    ui.get('/getinputfiles', async (request, response) => {
        const inputFilesDirectory = fs.readdirSync(config.optionUSMFilesDir).filter(f => f.endsWith('.usm'))
        inputFilesDirectory.forEach(f => { filesList.push(`${path.join(config.optionUSMFilesDir, f)}`) })

        response.send({ status: 'success', data: inputFilesDirectory.length, files: inputFilesDirectory })
    })

    ui.post('/start', async (request, response) => {
        optAudioTrack = request.body['audioTrack']
        optSubtitlesLang = request.body['subtitles']
        optFFmpegArgs = request.body['ffmpegArgs']

        response.sendStatus(200)
        filesToDemux = fs.readdirSync(config.optionUSMFilesDir).filter(f => f.endsWith('.usm'))
        await _callbackDemuxer(0, filesToDemux)
    })
}

async function demuxIndividualFile(file, indexCounter) {
    const cutsceneName = file.replace('.usm', '')

    exec(`cd ${config.prerequisites.gicutscenes.replace('\\GICutscenes.exe', '')};${config.prerequisites.gicutscenes} demuxUsm "${path.join(config.optionUSMFilesDir, file)}" -s -m -nc -o "${config.output}"`, { shell: 'powershell.exe' }, async function (stdout, stderr, error) {
        // fs.existsSync(path.join(config.output, '/Subs')) ? fs.readdirSync(path.join(config.output, '/Subs')).filter(f => f.endsWith('.ass')) : null
        const hasSubtitles = fs.existsSync(path.join(config.output, '/Subs')) ? true : false
        fs.readdirSync(config.output).filter(f => f.endsWith('.hca') || f.endsWith('.mkv')).forEach(async f => { 
            fs.unlinkSync(path.join(config.output, f))            
        })
        console.log('[' + chalk.greenBright('Demuxer') + '] Finished extracting ' + chalk.grey(file))

        const audioFile = `${cutsceneName}_${optAudioTrack}.wav`
        const videoFile = `${cutsceneName}.ivf`
        const subFile = hasSubtitles ? `${cutsceneName}_${optSubtitlesLang}.ass` : 'none'

        fs.moveSync(
            path.join(config.output, audioFile), 
            path.join(config.output, `./temp/${audioFile}`)
        )
        fs.readdirSync(config.output).filter(f => f.endsWith('.wav') || f.endsWith('.mkv')).forEach(async f => { 
            fs.unlinkSync(path.join(config.output, f))            
        })
        if(hasSubtitles) {
            fs.moveSync(
                path.join(config.output, `./Subs/${subFile}`), 
                path.join(config.output, `./temp/${subFile}`)
            )
            fs.readdirSync(path.join(config.output, '/Subs')).forEach(f => {
                fs.unlinkSync(path.join(config.output, `/Subs/${f}`))
            })
        }
        fs.moveSync(
            path.join(config.output, `${videoFile}`), 
            path.join(config.output, `./temp/${videoFile}`)
        )

        fs.moveSync(path.join(config.output, `./temp/${audioFile}`), path.join(config.output, `${audioFile}`))
        fs.moveSync(path.join(config.output, `./temp/${videoFile}`), path.join(config.output, `${videoFile}`))
        if(hasSubtitles) {
            fs.moveSync(path.join(config.output, `./temp/${subFile}`), path.join(config.output, `${subFile}`))
        }
        
        const ffmpegCommand = `cd ${config.output}; ffmpeg -i "${audioFile}" -i "${videoFile}"${optFFmpegArgs ? ` ${optFFmpegArgs}` : ''}${hasSubtitles ? ` -vf subtitles="${subFile}":fontsdir="./fonts":force_style="FontName=SDK_JP_Web"` : ''} "${cutsceneName}.mp4"`
        console.log('[' + chalk.greenBright('FFMPEG') + '] Started ffmpeg process' + `\n         └─ Audio: ${chalk.grey(audioFile)}\n         └─ Video: ${chalk.grey(videoFile)}\n         └─ Subtitles: ${chalk.grey(subFile)}\n         └─ Output: ${chalk.grey(cutsceneName + '.mp4')}\n         └─ Flags: ${chalk.grey(optFFmpegArgs ? optFFmpegArgs : '(none)')}`)
        
        const startDate = Date.now()
        exec(
            ffmpegCommand,
            { shell: 'powershell.exe' }, async function(stdout, stderr, error) {
                // prototype error detection - migrating to fluent-ffmpeg soon:tm:
                let success = true
                if(error.trim().split('\n')[error.trim().split('\n').length - 1].includes('Error')) success = false
                if(!success) {
                    console.log('\n[' + chalk.redBright('FFMPEG') + '] An exception occured. Detailed logs below.')
                    console.log(error)
                }
                else {
                    console.log('\n[' + chalk.greenBright('FFMPEG') + '] Finished task after ' + chalk.italic(chalk.grey(`${(Date.now() - startDate) / 1000}s\n`)))
                }
                
                fs.unlinkSync(path.join(config.output, audioFile))
                fs.unlinkSync(path.join(config.output, videoFile))
                if(hasSubtitles) fs.unlinkSync(path.join(config.output, subFile))

                const id = indexCounter + 1
                await _callbackDemuxer(id, filesToDemux)
            }
        )
    })
}

async function _callbackDemuxer(index, list) {
    if(index >= list.length) {
        console.log('[' + chalk.greenBright('Demuxer') + '] Finished!')
        return exec(`explorer ${config.output}`)
    
    }
    console.log('[' + chalk.greenBright('Demuxer') + '] Attempting to extract ' + chalk.grey(list[index]))
    await demuxIndividualFile(list[index], index)
}