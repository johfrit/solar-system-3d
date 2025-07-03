# 🌌 3D Solar System Simulation – Frontend Developer Assignment

**Author:** Johfrit J
**Assignment for:** Empty Cup Frontend Internship  
**Tech Stack:** JavaScript (ES6+), Three.js, HTML5, CSS3 (for layout only)  
**Live Demo:** [Click here to view the project in browser](https://solar-system-3d-ruby.vercel.app/)  
*(replace the link above after GitHub Pages setup)*

---

## 🎯 Objective

This is a **mobile-responsive** single-page web application that simulates a 3D solar system using [Three.js](https://threejs.org/).  
It was built to demonstrate my skills in:

- 3D rendering
- Object animation
- Scene creation
- Real-time user interaction  
All animation logic is implemented in **pure JavaScript** (no CSS animations used).

---

## 🪐 Core Features

✅ Real-time orbital animation of all 8 planets  
✅ Sun positioned at the center of the scene  
✅ Each planet rotates around the Sun at default speed  
✅ Individual **speed control sliders** for every planet  
✅ Planets immediately reflect speed changes using the Three.js animation loop  
✅ Clean code structure, reusable logic, and mobile responsiveness  

---

## 💎 Bonus Features Implemented

✔️ Pause/Resume animation button  
✔️ Background stars for a galactic ambiance  
✔️ Labels on hover for each planet  
✔️ Camera movement on planet click  
✔️ Responsive dark/light UI toggle  

---

## 🧠 Project Explanation

### 🌞 Planet & Orbit Creation:
- Each planet is created using `THREE.SphereGeometry` with realistic textures.
- Orbital paths are simulated by updating each planet’s `x` and `z` position using `Math.cos()` and `Math.sin()` based on an internal angle, which increases each frame.
- The Sun is a static mesh at the center, emitting light using `THREE.PointLight`.

### 🔧 Speed Control:
- For each planet, a `range` slider is linked to its angular speed in the animation loop.
- Speed updates reflect instantly without needing refreshes or re-renders.
- The logic uses `requestAnimationFrame` and `THREE.Clock` for smooth transitions.

---

