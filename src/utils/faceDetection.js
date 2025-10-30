import * as faceapi from 'face-api.js';

let modelsLoaded = false;

export async function loadModels() {
  if (modelsLoaded) return;

  const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.12/model';

  await Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
  ]);

  modelsLoaded = true;
}

export async function detectFace(videoElement) {
  const detection = await faceapi
    .detectSingleFace(videoElement, new faceapi.TinyFaceDetectorOptions())
    .withFaceLandmarks()
    .withFaceDescriptor();

  return detection;
}

export function calculateDistance(descriptor1, descriptor2) {
  return faceapi.euclideanDistance(descriptor1, descriptor2);
}

export function findBestMatch(faceDescriptor, labeledDescriptors, threshold = 0.6) {
  let bestMatch = null;
  let bestDistance = Infinity;

  for (const labeled of labeledDescriptors) {
    const distances = labeled.descriptors.map(desc =>
      calculateDistance(faceDescriptor, desc)
    );
    const minDistance = Math.min(...distances);

    if (minDistance < bestDistance) {
      bestDistance = minDistance;
      bestMatch = { label: labeled.label, distance: minDistance };
    }
  }

  if (bestMatch && bestMatch.distance < threshold) {
    const confidence = Math.round((1 - bestMatch.distance) * 100);
    return { ...bestMatch, confidence };
  }

  return null;
}
