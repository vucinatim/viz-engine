# 🚀 VizEngine: Business Model Strategy

### **1. The Core Philosophy**

**"Freedom to Create, Pay to Publish."**

* **The Engine is Free:** The core technology (React/Three.js renderer) is MIT licensed. It belongs to the community.
* **The Assets are Paid:** The "Pro" content (Templates, Advanced Nodes) is a paid service for professionals who want to save time.
* **The Moat:** We do not rely on heavy DRM. We rely on **Convenience** and **Service**. We bet that professionals will pay $10 to save an hour of hacking.

---

### **2. The Product Tiers**

| Feature | **Free (Community)** | **Pro (Subscriber)** |
| --- | --- | --- |
| **Editor Access** | **Unlimited** (Full Access) | **Unlimited** |
| **Project Saving** | Local (IndexedDB) | Local + Cloud (Future) |
| **Pro Assets** | **Preview Only** (Watermarked/Restricted) | **Full Use** (Clean Export) |
| **Export Quality** | Standard (1080p) | High (4K / 60FPS) |
| **Commercial License** | Self-Hosted Only | Included |

---

### **3. The "Pro" Assets (What users buy)**

These are the specific items that trigger the "Pro Gate." technically, they exist in the repo, but using them "legally" and "cleanly" requires a license.

1. **Visual Components (Code):** High-complexity viz-comps (e.g., `WebGPUParticles.ts`, `VolumetricFog.ts`).
2. **Logic Nodes (Code):** Specialized processing nodes (e.g., `BeatDetectionAI.ts`, `DMXOutput.ts`).
3. **Animation Graphs (JSON):** Pre-wired node networks that solve hard math problems (e.g., "Audio-Reactive Camera Shake").
4. **Full Templates (JSON):** Complete "Drop MP3 Here" project files (e.g., "Cyberpunk HUD", "Lofi Chill Loop").

---

### **4. The Technical Implementation (The "Gate")**

#### **A. The Licensing Engine**

* **Provider:** **Lemon Squeezy**.
* **Model:** Subscription (e.g., $15/month) or Lifetime Access (e.g., $149).
* **Mechanism:** User receives a License Key. They enter it in the Editor Settings.

#### **B. The "Preview" Logic (In-Editor)**

* **Experience:** Users can drag *any* Pro asset into their scene. It works immediately.
* **The Catch:** If a Pro asset is active, the Main Canvas renders a subtle overlay: *"VizEngine Pro Preview"*.
* **Why:** This hooks the user. They fall in love with the visual *before* they have to pay.

#### **C. The Export Gate (The Check)**

* When the user clicks **"Export Video"**:
1. The Engine scans the active Graph: `const hasPaidAssets = nodes.some(n => n.tier === 'pro');`
2. **If `hasPaidAssets` is TRUE:**
* Check `localStorage` for a valid License Key.
* **Valid?** Render Clean Video.
* **Invalid?** Show Modal: *"This project uses Pro assets. Subscribe to export without watermarks."* (Or allow export with a giant watermark).





---

### **5. Open Source & Contributor Strategy**

We explicitly support the "Hacker" spirit while protecting the business.

#### **A. The "Dev Mode" Bypass**

* **Config:** When `process.env.NODE_ENV === 'development'`, the License Check function **always returns TRUE**.
* **Result:** Contributors who clone the repo can build, debug, and modify Pro nodes without needing a key. They have zero friction.

#### **B. The "Source Available" Reality**

* **The Risk:** Yes, a user *could* clone the repo, modify the code to remove the `tier === 'pro'` check, and build a custom version to export for free.
* **The Response:** **We let them.**
* The user who spends 4 hours forking and maintaining a custom build was never going to pay us $15.
* The user who bills $100/hour just wants the "Export" button to work *now*. They are our customer.



---

### **6. Why this Wins**

1. **Zero Server Cost:** You serve the assets via GitHub/CDN. Lemon Squeezy handles the DB.
2. **Viral Growth:** Free users can create incredible (watermarked) content. If they share a screen recording, your brand is on it.
3. **Ethical:** You aren't locking "basic" features (like 1080p export) behind a paywall. You are only charging for **your added value** (the assets/templates).

This is a sustainable, low-stress business model that respects your time and your users. **Ship it.** 🚀