// More API functions here:
// https://github.com/googlecreativelab/teachablemachine-community/tree/master/libraries/image

// the link to your model provided by Teachable Machine export panel
const URL = "https://teachablemachine.withgoogle.com/models/qcUBZXTwP/";

let model, cameraVideo, cameraStream, labelContainer, maxPredictions;
let isRunning = false;

// Load the image model and setup the webcam
async function init() {
    if (isRunning) {
        return;
    }

    const startButton = document.getElementById("start-button");
    const status = document.getElementById("status");
    startButton.disabled = true;

    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        status.textContent =
            "Camera access requires the HTTPS site or a localhost server. Open the deployed site or run this project through localhost.";
        startButton.disabled = false;
        return;
    }

    status.textContent = "Loading the model...";

    try {
        const modelURL = URL + "model.json";
        const metadataURL = URL + "metadata.json";

        model = await tmImage.load(modelURL, metadataURL);
        maxPredictions = model.getTotalClasses();
        status.textContent = "Requesting camera access...";

        cameraStream = await withTimeout(
            navigator.mediaDevices.getUserMedia({
                video: { width: 200, height: 200 },
                audio: false
            }),
            15000,
            "Camera access timed out."
        );

        cameraVideo = document.createElement("video");
        cameraVideo.width = 200;
        cameraVideo.height = 200;
        cameraVideo.autoplay = true;
        cameraVideo.playsInline = true;
        cameraVideo.muted = true;
        cameraVideo.srcObject = cameraStream;

        document.getElementById("webcam-container").replaceChildren(cameraVideo);
        labelContainer = document.getElementById("label-container");
        labelContainer.replaceChildren();
        for (let i = 0; i < maxPredictions; i++) {
            labelContainer.appendChild(document.createElement("div"));
        }

        await withTimeout(cameraVideo.play(), 5000, "Camera playback timed out.");
        isRunning = true;
        startButton.textContent = "Running";
        status.textContent = "Camera started.";
        window.requestAnimationFrame(loop);
    } catch (error) {
        console.error("Unable to start the camera model.", error);
        if (cameraStream) {
            cameraStream.getTracks().forEach((track) => track.stop());
            cameraStream = null;
        }
        status.textContent = getCameraErrorMessage(error);
        startButton.disabled = false;
    }
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
        window.requestAnimationFrame(loop);
    } catch (error) {
        console.error("Unable to classify the camera image.", error);
        isRunning = false;
        document.getElementById("status").textContent =
            "The camera started, but image classification failed.";
        document.getElementById("start-button").disabled = false;
    }
}

// run the webcam image through the image model
async function predict() {
    const prediction = await model.predict(cameraVideo);
    for (let i = 0; i < maxPredictions; i++) {
        const classPrediction =
            prediction[i].className + ": " + prediction[i].probability.toFixed(2);
        labelContainer.childNodes[i].textContent = classPrediction;
    }
}

document.getElementById("start-button").addEventListener("click", init);
