function getVideoPathFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('videoPath'); // 假设参数名为 videoPath
}

// 设置视频路径到 video 标签中
function setVideoSource(videoPath) {
    if (videoPath) {
        const videoSource = document.getElementById('videoSource');
        const videoPlayer = document.getElementById('videoPlayer');

        videoSource.src = videoPath;
        videoPlayer.load(); // 重新加载视频
    } else {
        console.error('未找到有效的视频路径');
    }
}

// 执行函数
window.onload = function () {
    const videoPath = getVideoPathFromURL();
    setVideoSource(videoPath);
};
const videoParam = getQueryParam("video");

