/****************************************************************
<<<<<<< HEAD
 * 1. 读取 URL 参数
 ****************************************************************/
function getQueryParam(key) {
  const params = new URLSearchParams(window.location.search);
  return params.get(key);
}

/****************************************************************
 * 2. 加载 SRT 并解析
 ****************************************************************/
async function fetchSRT(url) {
  const response = await fetch(url);
  const text = await response.text();
  return parseSRT(text);
}

/**
 * parseSRT:
 * 将 SRT 内容解析成数组：
 * [
 *   { start: 1.1, end: 5.833, text: "字幕内容" },
 *   ...
 * ]
 */
function parseSRT(srtText) {
  // 以空行分隔每个字幕块
  const blocks = srtText.split(/\n\s*\n/);
  const subtitles = [];

  for (let block of blocks) {
    block = block.trim();
    if (!block) continue;

    const lines = block.split("\n");
    if (lines.length < 2) continue; // 最少需要[序号,时间,文本...]

    // 第2行通常是 "00:00:01,100 --> 00:00:05,833"
    const timeLine = lines[1];
    const textLines = lines.slice(2);

    const timeMatch = timeLine.match(/(\d{2}:\d{2}:\d{2},\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2},\d{3})/);
    if (timeMatch) {
      const startSec = srtTimeToSeconds(timeMatch[1]);
      const endSec = srtTimeToSeconds(timeMatch[2]);
      const text = textLines.join("\n").trim();

      subtitles.push({
        start: startSec,
        end: endSec,
        text
=======
 * 1. 加载 LRC 文件并解析
 *    - 时间戳要求 [mm:ss.xx]，即两位分钟、两位秒、点后两位小数
 ****************************************************************/
async function fetchLyrics(url) {
    const response = await fetch(url);
    const text = await response.text();
    return parseLRC(text);
  }
  
  /**
   * parseLRC:
   * 只匹配 [mm:ss.xx] 格式的行
   * 解析后返回数组：
   * [
   *   { start: 0.0, end: 5.0, text: "字幕1" },
   *   { start: 5.0, end: 10.0, text: "字幕2" },
   *   ...
   * ]
   */
  function parseLRC(lrcText) {
    const lines = lrcText.split("\n");
    const lrcData = [];
  
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
  
      // 更严格的正则：匹配 [mm:ss.xx]
      // 分组含义：
      //   match[1] -> mm (两位分钟)
      //   match[2] -> ss (两位秒)
      //   match[3] -> xx (两位小数)
      //   match[4] -> 剩余字幕文本
      const match = line.match(/\[(\d{2}):(\d{2})\.(\d{2})\](.*)/);
      if (match) {
        const min = parseInt(match[1], 10);
        const sec = parseInt(match[2], 10);
        const cent = parseInt(match[3], 10); // 两位小数
  
        // 转换为秒数：startTime
        // 分钟 * 60 + 秒 + 小数部分(cent/100)
        const startTime = min * 60 + sec + cent / 100;
  
        const text = match[4].trim();
        lrcData.push({ start: startTime, text });
      }
    }
  
    // 根据 startTime 排序
    lrcData.sort((a, b) => a.start - b.start);
  
    // 计算 endTime（把下一行的 start 当作当前行的 end）
    for (let i = 0; i < lrcData.length; i++) {
      if (i < lrcData.length - 1) {
        lrcData[i].end = lrcData[i + 1].start;
      } else {
        // 最后一行随意给个 5 秒或结合音频长度来定
        lrcData[i].end = lrcData[i].start + 5;
      }
    }
  
    return lrcData;
  }
  
  /****************************************************************
   * 2. 渲染字幕 + 绑定点击事件
   ****************************************************************/
  function renderLyrics(lyricsData, container) {
    container.innerHTML = "";
    for (let i = 0; i < lyricsData.length; i++) {
      const lineDiv = document.createElement("div");
      lineDiv.classList.add("lyric-line");
      lineDiv.textContent = lyricsData[i].text;
  
      // 把索引存在 dataset 里
      lineDiv.dataset.index = i;
  
      // 点击事件
      lineDiv.addEventListener("click", (e) => {
        const idx = parseInt(e.currentTarget.dataset.index, 10);
        handleLyricClick(idx);
>>>>>>> 15fb417eb0c1674e8f737917ecd19cb945e140e0
      });
    }
  }
<<<<<<< HEAD

  // 按开始时间排序
  subtitles.sort((a, b) => a.start - b.start);
  return subtitles;
}

/**
 * 将 "HH:MM:SS,mmm" 转为秒数 (float)
 */
function srtTimeToSeconds(timeStr) {
  const match = timeStr.match(/(\d{2}):(\d{2}):(\d{2}),(\d{3})/);
  if (!match) return 0;

  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const seconds = parseInt(match[3], 10);
  const millis = parseInt(match[4], 10);

  return hours * 3600 + minutes * 60 + seconds + millis / 1000;
}

/****************************************************************
 * 3. 渲染字幕 + 点击播放
 ****************************************************************/
function renderSubtitles(subsData, container) {
  container.innerHTML = "";
  for (let i = 0; i < subsData.length; i++) {
    const lineDiv = document.createElement("div");
    lineDiv.classList.add("lyric-line");
    lineDiv.textContent = subsData[i].text;

    lineDiv.dataset.index = i;

    // 点击字幕
    lineDiv.addEventListener("click", (e) => {
      const idx = parseInt(e.currentTarget.dataset.index, 10);
      handleSubtitleClick(idx);
    });

    container.appendChild(lineDiv);
  }
}

/****************************************************************
 * 4. 播放逻辑 + 高亮
 ****************************************************************/
let currentIndex = 0;           
let subsData = [];              
const audioPlayer = document.getElementById("audioPlayer");
const continuousModeCheckbox = document.getElementById("continuousMode");

/**
 * 点击字幕时
 */
function handleSubtitleClick(index) {
  if (index === currentIndex) {
    // 点击同一行 => 切换播放/暂停
    if (!audioPlayer.paused) {
      audioPlayer.pause();
    } else {
      audioPlayer.play();
    }
  } else {
    currentIndex = index;
    playSegment(currentIndex);
  }
  highlightSubtitleLine(index);
}

function playSegment(index) {
  if (index < 0 || index >= subsData.length) return;

  const startTime = subsData[index].start;
  const endTime = subsData[index].end;

  audioPlayer.pause();
  audioPlayer.currentTime = startTime;
  audioPlayer.play();

  audioPlayer.ontimeupdate = () => {
    if (audioPlayer.currentTime >= endTime) {
      audioPlayer.pause();
      audioPlayer.ontimeupdate = null;

      // 连续播放 or 重复当前段
      if (continuousModeCheckbox.checked) {
        currentIndex++;
        if (currentIndex < subsData.length) {
          playSegment(currentIndex);
          highlightSubtitleLine(currentIndex);
=======
  
  /****************************************************************
   * 3. 播放逻辑 + 高亮处理
   ****************************************************************/
  let currentIndex = 0;            // 当前播放的字幕索引
  let lyricsData = [];             // 解析得到的 LRC 数据
  const audioPlayer = document.getElementById("audioPlayer");
  const continuousModeCheckbox = document.getElementById("continuousMode");
  
  /**
   * 点击字幕时
   */
  function handleLyricClick(index) {
    if (index === currentIndex) {
      // 如果点击的是当前行 -> 切换播放 / 暂停
      if (!audioPlayer.paused) {
        audioPlayer.pause();
      } else {
        audioPlayer.play();
      }
    } else {
      // 切换到新的行
      currentIndex = index;
      playSegment(currentIndex);
    }
  
    // 高亮
    highlightLyricLine(index);
  }
  
  /**
   * 播放指定字幕段
   */
  function playSegment(index) {
    if (index < 0 || index >= lyricsData.length) return;
  
    const startTime = lyricsData[index].start;
    const endTime = lyricsData[index].end;
  
    // 跳转时间后播放
    audioPlayer.pause();
    audioPlayer.currentTime = startTime;
    audioPlayer.play();
  
    // 定时检测是否到达该段结束
    audioPlayer.ontimeupdate = () => {
      if (audioPlayer.currentTime >= endTime) {
        audioPlayer.pause();
        audioPlayer.ontimeupdate = null; // 清除监听
  
        // 检查连续播放
        if (continuousModeCheckbox.checked) {
          currentIndex++;
          if (currentIndex < lyricsData.length) {
            playSegment(currentIndex);
            highlightLyricLine(currentIndex);
          }
        } else {
          // 不连续：重复当前段
          playSegment(index);
          highlightLyricLine(index);
>>>>>>> 15fb417eb0c1674e8f737917ecd19cb945e140e0
        }
      } else {
        playSegment(index);
        highlightSubtitleLine(index);
      }
<<<<<<< HEAD
=======
    };
  }
  
  /**
   * 高亮某行字幕
   */
  function highlightLyricLine(index) {
    const lines = document.querySelectorAll(".lyric-line");
    // 先移除所有的 .active
    lines.forEach(line => line.classList.remove("active"));
    // 给当前行添加
    if (lines[index]) {
      lines[index].classList.add("active");
>>>>>>> 15fb417eb0c1674e8f737917ecd19cb945e140e0
    }
  };
}

/**
 * 高亮当前行
 */
function highlightSubtitleLine(index) {
  const lines = document.querySelectorAll(".lyric-line");
  lines.forEach(line => line.classList.remove("active"));
  if (lines[index]) {
    lines[index].classList.add("active");
  }
<<<<<<< HEAD
}

/****************************************************************
 * 5. 初始化：获取URL参数 -> 设置音频src -> 加载字幕
 ****************************************************************/
(async function init() {
  // 读取URL参数
  const audioParam = getQueryParam("audio"); // e.g. "audio/lesson1.mp3"
  const srtParam   = getQueryParam("srt");   // e.g. "subtitle/lesson1.srt"

  // 如果缺少参数 => 回到列表页（或给出提示）
  if (!audioParam || !srtParam) {
    alert("没有指定音频或字幕文件，返回列表页。");
    window.location.href = "index1.html";
    return;
  }

  // 设置音频src
  audioPlayer.src = audioParam;

  // 加载并解析SRT
  subsData = await fetchSRT(srtParam);

  // 渲染字幕
  const container = document.getElementById("lyricsContainer");
  renderSubtitles(subsData, container);

  // 若想页面加载后立即播放第1段，可执行：
  // playSegment(0);
})();
=======
  
  /****************************************************************
   * 4. 初始化：加载 LRC -> 渲染
   ****************************************************************/
  (async function init() {
    const container = document.getElementById("lyricsContainer");
  
    // 加载并解析 LRC（如果 LRC 文件名和路径改变，就改这里）
    lyricsData = await fetchLyrics("lyric.lrc");
  
    // 渲染字幕到页面
    renderLyrics(lyricsData, container);
  
    // 如果需要页面加载后直接播放第1段
    // playSegment(0);
  })();
  
>>>>>>> 15fb417eb0c1674e8f737917ecd19cb945e140e0
