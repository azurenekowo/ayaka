<p align="center">
<img src="https://raw.githubusercontent.com/azurenekowo/ayaka/main/resources/favicon.ico">
</p>

# <p style="text-align: center">Ayaka</o>
A graphical UI implementation for ToaHartor's [gi-cutsenes](https://github.com/ToaHartor/GI-cutscenes/) utility.
<br>
<br>
<br>
## Disclaimer
- This was created for educational and demonstrational purpose only.   
- I **didn't code** the demuxer / decrypter program myself, all I did was creating a front-end interface and code a new procedure to merge the video (see the "Limitations" section). All credits of the demuxing / decrypting process and the `gi-cutscenes` CLI program belongs to the mastermind of **[gh/ToaHartor](https://github.com/ToaHartor)**.  
- All assets, including the font and the cutscenes files are intellectual property of miHoYo. The icon was taken from [Genshin Impact Wiki](genshin-impact.fandom.com/).

## Features
- Select specific audio track / subtitles languages to be merged into a single video.
- Provide an easy and intuitive interface to interact with `gi-cutscenes`  

## How to run?
- *Prerequisites:*
    + [node.js](https://nodejs.org/en/download)
    + [gi-cutsenes](https://github.com/ToaHartor/GI-cutscenes/)
    + [FFmpeg](https://ffmpeg.org/download.html)  
<br>
<br>
- Clone this repository (or grab a download from [the latest release](https://github.com/azurenekowo/ayaka/releases/latest))  
- Open `config.json` and modify it to your own environment.
- After everything is ready, copy the USM file(s) into the input directory and run `node server.js`
- Access http://localhost:2809/ on your browser. If you had modified the port settings, then change it accordingly.

## Configuration file
`config.json` can be found at the root folder.  
Below is a simple cheatsheet / handbook.
```json
{
    "prerequisites": {
        "ffmpeg": "path",
        "gicutscenes": "<path_to_GICutscenes.exe>"
    },
    "output": "<output_directory>",
    "defaultFFMPEGFlags": "-c:v libx264",
    "optionUSMFilesDir": "<folder_containing_usm_files>"
}
```

| key  | meaning |
| ------------- | ------------- |
| `prerequisites.ffmpeg`  | The path to FFmpeg's binary. If set to  `path`, it'll look inside `%path%` |
| `prerequisites.gicutscenes`  | The path to gi-cutscenes binary |
| `output`  | The path to the folder that the program will use to export the video |
| `optionUSMFilesDir`  | The path to the folder containing the `.usm` file(s) to load in |

## .usm file schema (a simplified breakdown)
It's basically an archive that is encrypted and needs to be *decrypted/demuxed* in order to view its content.  

You can find them in `[genshin impact folder]\GenshinImpact_Data\StreamingAssets\VideoAssets\StandaloneWindows64`.   
You will see there are some cutscenes that have 2 files with the same name, suffixed with `Boy` / `Girl`. It is for <img style="width: 24px; height: 24px" src="https://static.wikia.nocookie.net/gensin-impact/images/a/a5/Aether_Icon.png"> Aether / <img style="width: 24px; height: 24px" src="https://static.wikia.nocookie.net/gensin-impact/images/9/9c/Lumine_Icon.png"> Lumine specifically.

Normally, it contains:  
- `filename.ivf`: The actual video file, without any subtitles or audio track.
- `filename_AUDIO_CODE.hca`: The encrypted audio file. There are 4 values available for `AUDIO_CODE`:   
    + `0`: Chinese  
    + `1`: English  
    + `2`: Japanese  
    + `3`: Korean
- If there are subtitles in the cutscene, gi-cutscenes will extract and convert them to `.ass` files, in the format `filename_LANG_CODE.ass`. There are 15 values available for `LANG_CODE`:   
    + `CHS`: Chinese Simplified 
    + `CHT`: Chinese Traditional
    + `DE`: German
    + `EN`: English
    + `ES`: Spanish
    + `FR`: French
    + `ID`: Indonesian
    + `IT`: Italian
    + `JP`: Japanese
    + `KR`: Korean
    + `PT`: Portuguese
    + `RU`: Russian
    + `TH`: Thai
    + `TR`: Turkish
    + `VI`: Vietnamese

## Limitations
ToaHartor's `gi-cutscenes` doesn't provide an option to extract subtitles individually. You have to use its `-m` (merge) option and `-nc` (no cleanup), that will merge the video in order to generate the `.ass` files.  
Then after that, the program will start merging the audio track, the video and the subtitles (if provided) into a `.mp4` file. 

## Roadmap / TODOs
- [ ] Live console output in the browser
- [ ] Improve the stability and fallback options if FFmpeg fails
- [ ] Migrating to `fluent-ffmpeg` instead of running it in the shell 
- [ ] Cross-platform support 

## Contribute to the project  
All contributions are appreciated.   
If you have an issue please submit it under the Issues tab. Or if you want to contribute, you can open a pull request.