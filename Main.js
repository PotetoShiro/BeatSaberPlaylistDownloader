const fs = require('fs');
const puppeteer = require('puppeteer');
const { chromium } = require('playwright');
const path = require('path');
const admZip = require('adm-zip');
const iohook = require('iohook');

function fileDate() {
    let date = new Date();
    let day = date.getDate();
    let month = date.getMonth() + 1;
    let year = date.getFullYear();
    let hours = date.getHours();
    let minutes = date.getMinutes();
    let seconds = date.getSeconds();
    return `${year}-${month}-${day}-${hours}-${minutes}-${seconds}`;
} // Devolve a Data/Hora.

async function Checkall(files) {
    let filesStatus = [];
    let status;
    const allEqual = (arr) => {return arr.every(v => v === arr[0])};
    for (i = 0;i < files.length;i++) {
        if (fs.existsSync(files[i])) status = true;
        else filesStatus.push(false);

        filesStatus.push(status);
    }
    if (allEqual(filesStatus)) return true;
    else return false;
} // Verifica se tem todos os arquivos.

async function WriteLog(logFileDir, log, type = 'Console') {
    if (type == 'Stdout') process.stdout.write(log);
    else console.log(log);
    fs.appendFileSync(logFileDir, `\n${log}`);
} // Escreve no Log.

async function CreateLog() {
    let logDir = './Log/';
    let init = `[${fileDate()}] Log Criado.`;
    let log;

    if (!fs.existsSync(logDir)) {
        await fs.mkdirSync(logDir, {recursive: true});
        log = `[${fileDate()}] Pasta Log Criada.`;
    } else {
        log = `[${fileDate()}] Pasta Log Já existe.`;
    }
    await fs.writeFileSync(`${logDir}${fileDate()}-Log.txt`); // Vai criar um txt chamado Log
    WriteLog(`${logDir}${fileDate()}-Log.txt`, log);
    WriteLog(`${logDir}${fileDate()}-Log.txt`, init);
    return `${logDir}${fileDate()}-Log.txt`;
} // Cria o Log.

async function CreateJsonConfig(logFileDir) {
    let filesToCheck = ['Config.json'];

    for (i = 0; i < filesToCheck.length; i++) {
        const fileName = filesToCheck[i];
        let log;
        // Vai tentar acessar os arquivos

        if (fs.existsSync(fileName)) { // existe
            log = `[${fileDate()}] Pasta ${fileName} Já existe.`;

        } else { 
            fs.writeFile(fileName, '', (err) => {});
            log = `[${fileDate()}] Pasta ${fileName} Criada.`;

        }
        WriteLog(logFileDir, log);
    }
} // Cria o Config.Json.

function CreateDirs(logFileDir, dirs) {
    // Dirs recebe uma lista e não o nome
    for (i = 0; i < dirs.length; i++ ) {
        let dirsName = dirs[i];
        let log;

        if (!fs.existsSync(dirsName)) {
            fs.mkdir(dirsName, {recursive: true}, (err) => {});
            log = `[${fileDate()}] Pasta ${dirsName} Criada.`;
        } else {
            log = `[${fileDate()}] Pasta ${dirsName} Já existe.`;
        }
        WriteLog(logFileDir, log);
    }
} // Cria os diretórios.

function ConfigWrite(logFileDir) {
    let config = {
                    //maxSimultaneousDownloads: 3
                    limitDownloadperMinuteTimer: 30000,
                    limitDownloadperMinute: 30
                };

    let data = JSON.stringify(config);

    fs.writeFileSync('Config.json', data);


    let log = `[${fileDate()}] Config.json Configurado`;
    WriteLog(logFileDir, log);
} // Escreve a configuração.

async function ConfigRead(logFileDir) {
    let data = await fs.readFileSync('Config.json');
    let config = JSON.parse(data);
    //let maxSimultaneousDownloads = config.maxSimultaneousDownloads;
    let limitDownloadperMinuteTimer = config.limitDownloadperMinuteTimer;
    let limitDownloadperMinute = config.limitDownloadperMinute;
    let log;

    for (i = 0; i< 2; i++) {
        if (i == 0) log = `[${fileDate()}] Leitura do arquivo Config.json Finalizada.`;
        else log = `[${fileDate()}] limitDownloadperMinuteTimer: ${limitDownloadperMinuteTimer}, limitDownloadperMinute: ${limitDownloadperMinute}.`;

        WriteLog(logFileDir, log);
    }

    return config;
} // Lê a configuração.

async function ReadPlayLists(logFileDir) {

    // Olha o que tem na pasta playlists

    let files = await fs.readdirSync('./Playlists/');
    let deleteplaylists = [];
    let playlist = [];
    let log;
    if (files.length == 0) return false;

    for (let i = 0; i < files.length; i++) {
        log = `[${fileDate()}] Pegando Hash da Playlist ${files[i]}.`;
        WriteLog(logFileDir, log);

        try {
            let data = fs.readFileSync(`./Playlists/${files[i]}`);
            let playlistInfo = JSON.parse(data);
            let playlistName = playlistInfo.playlistTitle;
            let playlistAuthor = playlistInfo.playlistAuthor;
            let playlistSongs = playlistInfo.songs;
            let bpfile = files[i].indexOf('.bplist');
            if (bpfile) {

                playlistSongs = await BplistToJson(playlistSongs);
            }
            if (playlistName != undefined && playlistAuthor != undefined && playlistSongs != undefined) {
                playlist.push({
                    name: playlistName,
                    author: playlistAuthor,
                    songs: playlistSongs
                });

            } else {
                // Aviso o log
                log = `[${fileDate()}] Playlist ${files[i]} não vai ser baixada, Motivo: Playlist Bugada.`;
                // manda para a playlist que deleta Motivo: Buga se eu não fizer isso
                deleteplaylists.push(files[i]);
            }
        } catch (e) {
            log = `[${fileDate()}] Playlist ${files[i]} não vai ser baixada, Motivo: Playlist não é json.`;

            deleteplaylists.push(files[i]);
            fs.unlinkSync(`./Playlists/${files[i]}`);
        }
    }
    WriteLog(logFileDir, log);

        // Deleta playlist
    for (let i = 0; i < deleteplaylists.length; i++) {
        let findPlaylist = files.indexOf(deleteplaylists[i]);
        files.splice(findPlaylist, 1);
        deleteplaylists.splice(deleteplaylists[i], 1);

    }
    let dirsName = [];
    for (let i = 0; i < playlist.length; i++) {
        dirsName.push(`./Musicas/${playlist[i].name}`);
    }
    await CreateDirs(logFileDir, dirsName);
    return playlist;
} // Olha todas as playlists e adiciona as informações delas dentro de um obj que está em uma array

async function BplistToJson(playlist) {
    for (j = 0; j < playlist.length; j++) {
        delete playlist[j].key;
        delete playlist[j].songName;
        delete playlist[j].levelAuthorName;
        delete playlist[j].levelid;
        delete playlist[j].dateAdded;
    }
    return playlist;
}
async function CatchBeatSaverApiDownload(logFileDir, playlist, config) {
    // Lendo Configurações
    let limit = config.limitDownloadperMinute;
    let timer = config.limitDownloadperMinuteTimer;
    let current = 0;
    let notFoundMusics = [];
    let log;

    log = `[${fileDate()}] Configuração do download: Timer: ${timer}, Limite: ${limit}.`;
    WriteLog(logFileDir, log);

    let lastSeconds = new Date().getSeconds();
    let lastMinutes = new Date().getMinutes();

    log = `[${fileDate()}] Pegando link de download das músicas da Playlist: ${playlist.name}.`;
    WriteLog(logFileDir, log);
    for (j = 0; j < playlist.songs.length; j++) {
        let currentMinutes = new Date().getMinutes();
        let currentSeconds = new Date().getSeconds();

        if (current == 30 && lastMinutes + 1 == currentMinutes && lastSeconds == currentSeconds) log = `[${fileDate()}] Limite de downloads por minuto atingindo! Ativando Timer.`;
        else log = `[${fileDate()}] Playlist: ${playlist.name}, Música: ${j+1}/${playlist.songs.length}. Status: `;

        if (log.indexOf('Status') != -1) WriteLog(logFileDir, log, 'Stdout');
        else WriteLog(logFileDir, log);

        if (current == 30 && lastMinutes + 1 == currentMinutes && lastSeconds == currentSeconds) {
            Sleep(timer, () => {});
            current = 0;
        }
        let hash = playlist.songs[j].hash.toLowerCase();
        let url = `https://beatsaver.com/api/maps/by-hash/${hash}`;

        // Abre o Browser e a página, entra na Api e pega as informações

        let browser = await puppeteer.launch({
            headless: true
            });

        let page = await browser.newPage();
        await page.goto(url, { waitUntil: 'networkidle2'});

        let musicInfo = await page.evaluate(() => {
            let data = document.querySelector('body > pre').innerText;
            return data;
        });
        let status;
        // Estado da música
        if (musicInfo == 'Not Found') {
            status =  'Não encontrada';
            notFoundMusics.push(playlist.songs[j]);
        } else {
            // Transforma em json
            musicInfo = JSON.parse(musicInfo);
            //Adiciona o link para download
            let directDownload = musicInfo.directDownload;
            let songName = musicInfo.metadata.songName;
            let levelAuthorName = musicInfo.metadata.levelAuthorName;
            let musicKey = musicInfo.key;
            playlist.songs[j].directDownload = `https://beatsaver.com${directDownload}`;
            playlist.songs[j].songName = songName;
            playlist.songs[j].levelauthorName = levelAuthorName;
            playlist.songs[j].key = musicKey;
            status =  'Encontrada';
        }
        log = status;
        WriteLog(logFileDir, `${status}\n`, 'Stdout');

        await browser.close();
        current++;
    }
    for (k = 0; k < notFoundMusics.length;k++) {
            let find = playlist.songs.indexOf(notFoundMusics[k]);
            playlist.songs.splice(find, 1);
    }

    return playlist;
} // Pega a informação de cada música/verifica se ela ainda existe no Beat Saber e salva as informações no obj de cada música

function Sleep(time, callback) {
    var stop = new Date().getTime();
    while(new Date().getTime() < stop + time) {
    }
    callback();
} // "Delay"

async function DownloadPlaylistsMusic(logFileDir, playlist) {
    let log;
    // Cada música
    for (let j = 0; j < playlist.songs.length; j++) {
        let musicInfo = playlist.songs[j];
        let songName = musicInfo.songName;
        let filter = ['/', ':', '*', '?', '"', '<', '>', '|'];
        let levelAuthorName = musicInfo.levelauthorName;
        let musicKey = musicInfo.key;
        for (let k = 0; k < filter.length; k++) {
            songName = songName.split(filter[k]).join('');
        }
        let fileName = `${musicKey} (${songName} - ${levelAuthorName})`;
        let musicExist = await MusicVerify(playlist.songs[j], `./Musicas/${playlist.name}/`);
        let dirName = playlist.name;
        if (musicExist) {
            log = `[${fileDate()}] Playlist: ${dirName} Música: ${playlist.songs[j].songName} [${j+1}/${playlist.songs.length}] Já Existe.`;
            WriteLog(logFileDir, log);
        } else {
            await DownloadMusic([dirName, playlist.songs[j].songName, j+1, playlist.songs.length, playlist.songs[j].directDownload, fileName], logFileDir);
            log = `[${fileDate()}] Playlist: ${dirName} Música: ${playlist.songs[j].songName} [${j+1}/${playlist.songs.length}] Download Finalizado.`;
            WriteLog(logFileDir, log);
            log = `[${fileDate()}] Playlist: ${dirName} Música: ${playlist.songs[j].songName} [${j+1}/${playlist.songs.length}] Descompactação Iniciada.`;
            WriteLog(logFileDir, log);    
            await unzip([dirName, fileName]);
            log = `[${fileDate()}] Playlist: ${dirName} Música: ${playlist.songs[j].songName} [${j+1}/${playlist.songs.length}] Descompactação Finalizada.`;
            WriteLog(logFileDir, log);
        }
    }
    
} // Baixa as músicas da playlist e salva

async function MusicVerify(key, musicdir) {
    let files = await fs.readdirSync(musicdir);
    let check = [];
    let status;
    for (let i = 0; i < files.length; i++) {
        if (files[i].indexOf(key.key) != -1) {
            check.push(true);
        } else {
            check.push(false);
        }
    }
    for (let i = 0; i < check.length; i++) {
        if (check[i]) {
            status = true;
        } else if (status != true) {
            status = false;
        }
    }
    return status; 
} // Verifica se a música existe

async function DownloadMusic(dirinfo, logFileDir) {
    let url = dirinfo[4];
    let browser = await chromium.launchPersistentContext(path.resolve(__dirname, 'browser'), {
            acceptDownloads: true,
            headless: true,
            downloadsPath: path.resolve(__dirname, `Musicas/${dirinfo[0]}`)
    });
    let page = await browser.newPage();
    await page.goto(url).catch(e => {});
        //Evento de Download
    let [ download ] = await Promise.all([
        page.waitForEvent('download'), // wait for download to start
        log = `[${fileDate()}] Playlist: ${dirinfo[0]} Música: ${dirinfo[1]} [${dirinfo[2]}/${dirinfo[3]}] Download Iniciado.`,
        WriteLog(logFileDir, log)

    ]);
    // Se falhar o Download
    let failure = await download.failure();
    if (failure != null) {
        log = `Deu erro no Download da Playlist: ${dirinfo[0]} Música: ${dirinfo[1]} [${dirinfo[2]}/${dirinfo[3]}]`;
        WriteLog(logFileDir, log);
    }
    let downloadPath = await download.path();
    let musicFile = fs.readFileSync(downloadPath); 

    fs.writeFileSync(`./Musicas/${dirinfo[0]}/${dirinfo[5]}.zip`, musicFile);

    await download.delete();
    await browser.close();

}

async function unzip(dirinfo) {
    await fs.mkdirSync(`./Musicas/${dirinfo[0]}/${dirinfo[1]}`, {recursive: true});
    let zip = new admZip(`./Musicas/${dirinfo[0]}/${dirinfo[1]}.zip`);
    let zipEntries = zip.getEntries();
    await zip.extractAllTo(`./Musicas/${dirinfo[0]}/${dirinfo[1]}`, true);
    await fs.unlinkSync(`./Musicas/${dirinfo[0]}/${dirinfo[1]}.zip`);
}

async function main() {
    iohook.on("keypress", event => {
        if (event.keychar == 102) process.exit();
    });
    iohook.start();
    //try {
        let logFile = await CreateLog();
        let erro;
        let currentplaylist;

        await CreateJsonConfig(logFile);
        await ConfigWrite(logFile);
        await CreateDirs(logFile, ['./Musicas', './Playlists']);

        if (await Checkall(['./Musicas', './Playlists', 'Config.json', './Log']) === true) {
            let config = await ConfigRead(logFile);
            let playlist = await ReadPlayLists(logFile);
            if (playlist != false) {
                for (let i = 0; i < playlist.length;i++) {
                    currentplaylist = await CatchBeatSaverApiDownload(logFile, playlist[i], config);
                    await DownloadPlaylistsMusic(logFile, currentplaylist);
                }
                WriteLog(logFile, 'Terminei de baixar as músicas');
            } else {
                erro = 'Não tem playlists na pasta Playlists.';
                WriteLog(logFile, erro);
            }
            WriteLog(logFile, 'Aperte F para sair.');

        } else {
            erro = 'As Pastas não Existem.';
            WriteLog(logFile, erro);
        }
    //} catch (e) {
    //   erro = `Erro no programa, fala com o criador(Shiro#2985) no discord e manda isso para ele -> ${e}`;
    //    console.log(erro);
    //}
} // Roda o Programa

main();