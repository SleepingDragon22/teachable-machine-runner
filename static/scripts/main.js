"use strict";

let currClass = [];
let classes = [];
let identFuncId = 0;
let recognizer = undefined;
let serialPort = undefined;

function storageAvailable(type) {
	let storage;
	try {
	  storage = window[type];
	  const x = "__storage_test__";
	  storage.setItem(x, x);
	  storage.removeItem(x);
	  return true;
	} catch (e) {
	  return (
		e instanceof DOMException &&
		// everything except Firefox
		(e.code === 22 ||
		  // Firefox
		  e.code === 1014 ||
		  // test name field too, because code might not be present
		  // everything except Firefox
		  e.name === "QuotaExceededError" ||
		  // Firefox
		  e.name === "NS_ERROR_DOM_QUOTA_REACHED") &&
		// acknowledge QuotaExceededError only if there's something already stored
		storage &&
		storage.length !== 0
	  );
	}
  }

document.getElementById("enableIdent").addEventListener("click", async function(){
	recognizer = await createModel();
	init();
})

document.getElementById("disableIdent").addEventListener("click",function(){
	recognizer.stopListening()
})

document.getElementById("connect").addEventListener("click",function(){
	navigator.serial.requestPort().then((port) => {
		// Connect to `port` or add it to the list of available ports.
		port.open({baudRate: 115200}).then(()=>{
			serialPort = port;
			let status = document.getElementById("connect-status");
			status.innerHTML = "Connected"
		});
	})
	.catch((e) => {
		alert("No port was selected.")
	});
});


document.getElementById("disconnect").addEventListener("click",function(){
	if (serialPort != undefined){
		serialPort.close();
		let status = document.getElementById("connect-status");
		status.innerHTML = "Disconnected"
	}
});


window.addEventListener('load', function () {
	if (storageAvailable("localStorage")){
		if (localStorage.getItem("modelURL")) {
			document.getElementById('modelURL').value = localStorage.getItem("modelURL");
		}
	}
});

function sendResult(className){
	if (serialPort != undefined){
		if (serialPort.writable != null){
			className += "$";
			const encoder = new TextEncoder();
			const writer = serialPort.writable.getWriter();
			writer.write(encoder.encode(className)).then(() => {
				writer.releaseLock();
			});
		}
	}
}

// more documentation available at
// https://github.com/tensorflow/tfjs-models/tree/master/speech-commands

// the link to your model provided by Teachable Machine export panel
//const URL = "https://teachablemachine.withgoogle.com/models/Qp_lXOBSb/"; // on/off
//const URL = "https://teachablemachine.withgoogle.com/models/GU7qKNLsH/";

async function createModel() {
	let URL = document.getElementById('modelURL').value;
	if (storageAvailable("localStorage")){
		window.localStorage.setItem("modelURL", URL);
	}
	const checkpointURL = URL + "model.json"; // model topology
	const metadataURL = URL + "metadata.json"; // model metadata

	const recognizer = speechCommands.create(
		"BROWSER_FFT", // fourier transform type, not useful to change
		undefined, // speech commands vocabulary feature, not useful for your models
		checkpointURL,
		metadataURL);

	// check that model and metadata are loaded via HTTPS requests.
	await recognizer.ensureModelLoaded();

	return recognizer;
}

// async function init2() {
// 	const recognizer = await createModel();
// 	const classLabels = recognizer.wordLabels(); // get class labels
// 	const labelContainer = document.getElementById("label-container");
// 	for (let i = 0; i < classLabels.length; i++) {
// 		labelContainer.appendChild(document.createElement("div"));
// 	}

// 	// listen() takes two arguments:
// 	// 1. A callback function that is invoked anytime a word is recognized.
// 	// 2. A configuration object with adjustable fields
// 	recognizer.listen(result => {
// 		const scores = result.scores; // probability of prediction for each class
// 		// render the probability scores per class
// 		for (let i = 0; i < classLabels.length; i++) {
// 			const classPrediction = classLabels[i] + ": " + result.scores[i].toFixed(2);
// 			labelContainer.childNodes[i].innerHTML = classPrediction;
// 		}
// 	}, {
// 		includeSpectrogram: true, // in case listen should return result.spectrogram
// 		probabilityThreshold: 0.75,
// 		invokeCallbackOnNoiseAndUnknown: true,
// 		overlapFactor: 0.50 // probably want between 0.5 and 0.75. More info in README
// 	});

// 	// Stop the recognition in 5 seconds.
// 	// setTimeout(() => recognizer.stopListening(), 5000);
// }

async function init() {
	const classLabels = recognizer.wordLabels(); // get class labels
	const labelContainer = document.getElementById("label-container");
	for (let i = 0; i < classLabels.length; i++) {
		labelContainer.appendChild(document.createElement("div"));
	}
	recognizer.listen(result => {
		// render the probability scores per class
		let maxClass = "";
		let maxScore = 0;
		for (let i = 0; i < classLabels.length; i++) {
			const classPrediction = classLabels[i] + ": " + result.scores[i].toFixed(2);
			labelContainer.childNodes[i].innerHTML = classPrediction;
			if (result.scores[i] > maxScore){
				maxClass = classLabels[i];
				maxScore = result.scores[i];
			}
		}
		let status = document.getElementById("live-status");
		status.innerHTML = "Result updated"
		sendResult(maxClass);
	}, {
		includeSpectrogram: true, // in case listen should return result.spectrogram
		probabilityThreshold: 0.75,
		invokeCallbackOnNoiseAndUnknown: true,
		overlapFactor: 0.50 // probably want between 0.5 and 0.75. More info in README
	});
}