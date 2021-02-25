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
    let config = JSON.parse(data)
    //let maxSimultaneousDownloads = config.maxSimultaneousDownloads;
    let limitDownloadperMinuteTimer = config.limitDownloadperMinuteTimer;
    let limitDownloadperMinute = config.limitDownloadperMinute;
    let log;

    for (i = 0; i< 2; i++) {
        if (i == 0) log = `[${fileDate()}] Leitura do arquivo Config.json Finalizada.`;
        else log = `[${fileDate()}] limitDownloadperMinuteTimer: ${limitDownloadperMinuteTimer}, limitDownloadperMinute: ${limitDownloadperMinute}.`;

        WriteLog(logFileDir, log)
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

    for (i = 0; i < files.length; i++) {
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
                for (j = 0; j < playlistSongs.length; j++) {
                    delete playlistSongs[j].key;
                    delete playlistSongs[j].songName;
                    delete playlistSongs[j].levelAuthorName;
                    delete playlistSongs[j].levelid;
                    delete playlistSongs[j].dateAdded;
                }
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
    for (i = 0; i < deleteplaylists.length; i++) {
        let findPlaylist = files.indexOf(deleteplaylists[i]);
        files.splice(findPlaylist, 1);
        deleteplaylists.splice(deleteplaylists[i], 1);

    }
    let dirsName = [];
    for (i = 0; i < playlist.length; i++) {
        dirsName.push(`./Musicas/${playlist[i].name}`);
    }
    CreateDirs(logFileDir, dirsName);

    return playlist;
} // Olha todas as playlists e adiciona as informações delas dentro de um obj que está em uma array

async function CatchBeatSaverApiDownload(logFileDir, playlist, config) {
    // Lendo Configurações
    let limit = config.limitDownloadperMinute;
    let timer = config.limitDownloadperMinuteTimer;
    let current = 0;
    let notFoundMusics = [];
    let log;

    log = `[${fileDate()}] Configuração do download: Timer: ${timer}, Limite: ${limit}.`;
    WriteLog(logFileDir, log);

    for (i = 0; i < playlist.length; i++) {
        let lastSeconds = new Date().getSeconds();
        let lastMinutes = new Date().getMinutes();

        log = `[${fileDate()}] Pegando link de download das músicas da Playlist: ${playlist[i].name}.`;
        WriteLog(logFileDir, log);
        for (j = 0; j < playlist[i].songs.length; j++) {
            let currentMinutes = new Date().getMinutes();
            let currentSeconds = new Date().getSeconds();

            if (current == 30 && lastMinutes + 1 == currentMinutes && lastSeconds == currentSeconds) log = `[${fileDate()}] Limite de downloads por minuto atingindo! Ativando Timer.`;
            else log = `[${fileDate()}] Playlist: ${playlist[i].name}, Música: ${j+1}/${playlist[i].songs.length}. Status: `;

            if (log.indexOf('Status') != -1) WriteLog(logFileDir, log, 'Stdout');
            else WriteLog(logFileDir, log);

            if (current == 30 && lastMinutes + 1 == currentMinutes && lastSeconds == currentSeconds) {
                Sleep(timer, () => {});
                current = 0;
            }

            let hash = playlist[i].songs[j].hash.toLowerCase();
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
                notFoundMusics.push(playlist[i].songs[j]);
            } else {
                // Transforma em json
                musicInfo = JSON.parse(musicInfo);
                //Adiciona o link para download
                let directDownload = musicInfo.directDownload;
                let songName = musicInfo.metadata.songName;
                let levelAuthorName = musicInfo.metadata.levelAuthorName;
                let musicKey = musicInfo.key;
                playlist[i].songs[j].directDownload = `https://beatsaver.com${directDownload}`;
                playlist[i].songs[j].songName = songName;
                playlist[i].songs[j].levelauthorName = levelAuthorName;
                playlist[i].songs[j].key = musicKey;
                status =  'Encontrada';
            }
            log = status;
            WriteLog(logFileDir, `${status}\n`, 'Stdout');

            await browser.close();
            current++;
        }
        for (k = 0; k < notFoundMusics.length;k++) {
            let find = playlist[i].songs.indexOf(notFoundMusics[k]);
            playlist[i].songs.splice(find, 1);
        }
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
    // Cada playlist
    for (i = 0;i < playlist.length;i++) {
        // Cada música
        for (j = 0; j < playlist[i].songs.length; j++) {
            let dirName = playlist[i].name;
            // Iniciando o navegador
            const browser = await chromium.launchPersistentContext(path.resolve(__dirname, 'browser'), {
                acceptDownloads: true,
                headless: true,
                downloadsPath: path.resolve(__dirname, `Musicas/${dirName}`)
            });
            const page = await browser.newPage();
            let url = playlist[i].songs[j].directDownload;
            // Entra no link
            await page.goto(url).catch(e => {});
            //Evento de Download
            const [ download ] = await Promise.all([
                page.waitForEvent('download'), // wait for download to start
                log = `[${fileDate()}] Playlist: ${dirName} Música: ${playlist[i].songs[j].songName} [${j+1}/${playlist[i].songs.length}] Download Iniciado.`,
                WriteLog(logFileDir, log)

            ]);
            // Se falhar o Download
            let failure = await download.failure();
            if (failure != null) {
                log = `Deu erro no Download da Playlist: ${dirName} Música: ${playlist[i].songs[j].songName} [${j+1}/${playlist[i].songs.length}]`;
                WriteLog(logFileDir, log);
            }

            // Configs para a pasta
            let musicInfo = playlist[i].songs[j];
            let songName = musicInfo.songName;
            const filter = ['/', ':', '*', '?', '"', '<', '>', '|'];
            let levelAuthorName = musicInfo.levelauthorName;
            let musicKey = musicInfo.key;
            for(k = 0; k < filter.length; k++) {
                songName.replaceAll(filter[i], '');
                levelAuthorName.replaceAll(filter[i], '');
            }
            const fileName = `${musicKey} (${songName} - ${levelAuthorName})`;
            // Salvar a música
            let downloadPath = await download.path();
            let musicFile = fs.readFileSync(downloadPath); 

            fs.writeFileSync(`./Musicas/${dirName}/${fileName}.zip`, musicFile);
            // Finaliza o download
            await download.delete();
            await browser.close();
            log = `[${fileDate()}] Playlist: ${dirName} Música: ${playlist[i].songs[j].songName} [${j+1}/${playlist[i].songs.length}] Download Finalizado.`;
            WriteLog(logFileDir, log);
            log = `[${fileDate()}] Playlist: ${dirName} Música: ${playlist[i].songs[j].songName} [${j+1}/${playlist[i].songs.length}] Descompactação Iniciada.`;
            WriteLog(logFileDir, log);

            // Cria a pasta da música
            await fs.mkdirSync(`./Musicas/${dirName}/${fileName}`, {recursive: true});
            // Descompactar
            let zip = new admZip(`./Musicas/${dirName}/${fileName}.zip`);
            let zipEntries = zip.getEntries();
            zip.extractAllTo(`./Musicas/${dirName}/${fileName}`, true);
            // Delete a pasta zip da música
            fs.unlinkSync(`./Musicas/${dirName}/${fileName}.zip`);

            log = `[${fileDate()}] Playlist: ${dirName} Música: ${playlist[i].songs[j].songName} [${j+1}/${playlist[i].songs.length}] Descompactação Finalizada.`;
            WriteLog(logFileDir, log);
        }
    }
} // Baixa as músicas da playlist e salva

async function main() {
    iohook.on("keypress", event => {
        if (event.keychar == 102) process.exit();
    });
    iohook.start();
    try {
        let logFile = await CreateLog();
        let erro;

        await CreateJsonConfig(logFile);
        await ConfigWrite(logFile);
        await CreateDirs(logFile, ['./Musicas', './Playlists']);

        if (await Checkall(['./Musicas', './Playlists', 'Config.json', './Log']) === true) {
            let config = await ConfigRead(logFile);
            let playlist = await ReadPlayLists(logFile);
            if (playlist != false) {
                playlist = await CatchBeatSaverApiDownload(logFile, playlist, config);
                await DownloadPlaylistsMusic(logFile, playlist);
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
    } catch (e) {
        erro = `Erro no programa, falar com o criador(Shiro#2985) no discord e mandar isso para ele -> ${e}`;
        console.log(erro);
    }
} // Roda o Programa

main();