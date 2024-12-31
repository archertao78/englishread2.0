/****************************************************************
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
      });
    }
  }

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
        }
      } else {
        playSegment(index);
        highlightSubtitleLine(index);
      }
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
    window.location.href = "index.html";
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
