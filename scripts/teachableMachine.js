// Code is based on that which is provided by Teachable Machine
// More API functions here:
// https://github.com/googlecreativelab/teachablemachine-community/tree/master/libraries/image

// the link to your model provided by Teachable Machine export panel
const URL = "https://teachablemachine.withgoogle.com/models/qcUBZXTwP/";

let model, cameraVideo, cameraStream, labelContainer, maxPredictions;
let isRunning = false;
let animationFrameId = null;

// Load the image model and setup the webcam
async function init() {
    if (isRunning) {
        return;
    }

    // get elements
    const startButton = document.getElementById("start-button");
    const status = document.getElementById("status");
    const modelMachine = document.getElementById("model-machine");
    startButton.disabled = true;

    // check camera is accessible
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        status.textContent =
            "Camera access requires the HTTPS site or a localhost server. Open the deployed site or run this project through localhost.";
        modelMachine.hidden = false;
        startButton.disabled = false;
        return;
    }

    // give user update
    status.textContent = "Loading the model...";
    modelMachine.hidden = false;

    // if possible, use the camera
    try {
        const modelURL = URL + "model.json";
        const metadataURL = URL + "metadata.json";

        model = await tmImage.load(modelURL, metadataURL);
        maxPredictions = model.getTotalClasses();
        status.textContent = "Requesting camera access...";

        // if loading takes too long, resolve it as an error to improve user experience
        cameraStream = await withTimeout(
            navigator.mediaDevices.getUserMedia({
                video: { width: 200, height: 200 },
                audio: false
            }),
            15000,
            "Camera access timed out."
        );

        // create the video element
        cameraVideo = document.createElement("video");
        cameraVideo.width = 200;
        cameraVideo.height = 200;
        cameraVideo.autoplay = true;
        cameraVideo.playsInline = true;
        cameraVideo.muted = true;
        cameraVideo.srcObject = cameraStream;

        const webcamContainer = document.getElementById("webcam-container");
        webcamContainer.hidden = false;
        webcamContainer.replaceChildren(cameraVideo);
        labelContainer = document.getElementById("label-container");
        labelContainer.replaceChildren();
        for (let i = 0; i < maxPredictions; i++) {
            labelContainer.appendChild(document.createElement("div"));
        }

        await withTimeout(cameraVideo.play(), 5000, "Camera playback timed out.");
        isRunning = true;
        document.getElementById("results-container").hidden = false;
        startButton.textContent = "Pause";
        startButton.disabled = false;
        status.textContent = "Camera started.";
        animationFrameId = window.requestAnimationFrame(loop);
    } catch (error) {
        console.error("Unable to start the camera model.", error);
        stopCamera();
        status.textContent = getCameraErrorMessage(error);
        startButton.textContent = "Start";
        startButton.disabled = false;
    }
}

// change what is displayed based on the button toggle
async function toggleCamera() {
    const startButton = document.getElementById("start-button");
    const status = document.getElementById("status");

    // if the video is running, stop it
    if (isRunning) {
        stopCamera();
        startButton.textContent = "Resume";
        startButton.disabled = false;
        status.textContent = "Camera paused.";
        return;
    }

    // otherwise, start the camera
    await init();
}


function stopCamera() {
    isRunning = false;

    if (animationFrameId !== null) {
        window.cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }

    if (cameraVideo) {
        cameraVideo.pause();
        cameraVideo.srcObject = null;
        cameraVideo.remove();
        cameraVideo = null;
    }

    if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
        cameraStream = null;
    }

    document.getElementById("webcam-container").replaceChildren();
    document.getElementById("webcam-container").hidden = true;
    document.getElementById("results-container").hidden = true;
    document.getElementById("label-container").replaceChildren();
    document.getElementById("predicted-label").textContent = "";
}

function withTimeout(promise, milliseconds, message) {
    return Promise.race([
        promise,
        new Promise((_, reject) => {
            window.setTimeout(() => reject(new Error(message)), milliseconds);
        })
    ]);
}

function getCameraErrorMessage(error) {
    if (error.message === "Camera access timed out.") {
        return "Camera access timed out. Check the browser camera permission and try again.";
    }

    if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
        return "Camera permission was denied. Allow camera access for this site, then try again.";
    }

    if (error.name === "NotFoundError") {
        return "No camera was found. Connect a camera and try again.";
    }

    return "Unable to start the camera model. Check camera permissions and try again.";
}

async function loop() {
    if (!isRunning) {
        return;
    }

    try {
        await predict();
        if (isRunning) {
            animationFrameId = window.requestAnimationFrame(loop);
        }
    } catch (error) {
        if (!isRunning) {
            return;
        }

        console.error("Unable to classify the camera image.", error);
        isRunning = false;
        document.getElementById("status").textContent =
            "The camera started, but image classification failed.";
        document.getElementById("start-button").disabled = false;
    }
}

// run the webcam image through the image model
async function predict() {
    const video = cameraVideo;
    if (!isRunning || !video) {
        return;
    }

    const prediction = await model.predict(video);
    if (!isRunning || cameraVideo !== video) {
        return;
    }

    const highestProbabilityPrediction = prediction.reduce(
        (highest, current) =>
            current.probability > highest.probability ? current : highest
    );
    document.getElementById("predicted-label").textContent =
        highestProbabilityPrediction.className;

    for (let i = 0; i < maxPredictions; i++) {
        const classPrediction =
            prediction[i].className + ": " + prediction[i].probability.toFixed(2);
        labelContainer.childNodes[i].textContent = classPrediction;
    }
}

document.getElementById("start-button").addEventListener("click", toggleCamera);
