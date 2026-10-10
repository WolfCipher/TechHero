function toggleMusic() {
    // PH: fetch the audio element
    const music = document.getElementById("bg-music");
    // PH: fetch the play button element
    const button = document.getElementById("music-toggle");
    // PH: fetch the music-info element
    const info = document.getElementById("music-info");
    

    if (music.paused) {
        music.play();
        button.textContent = "Pause Music";
        info.textContent = "Playing \"The Long Night\" by Evan Call";
    } else {
        music.pause();
        button.textContent = "Play Music";
        info.textContent = "";
    }
}