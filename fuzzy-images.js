(function () {
  const IMGBB_API_KEY = "38f5349bc38fbf6581e25c9bcd61e6d0";
  let selectedFile = null;
  let isSubmitting = false;

  // 1. Inject Media Upload UI
  function setupMediaUploaderUI() {
    const postModal = document.getElementById("postModal");
    if (!postModal || document.getElementById("fuzzyMediaBtn")) return;

    const modalContent = postModal.querySelector(".modal");
    const modalBtns = postModal.querySelector(".modal-btns");

    if (!modalContent || !modalBtns) return;

    // File Input for Images, GIFs, and Videos
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.id = "fuzzyFileInput";
    fileInput.accept = "image/*,video/mp4,video/webm,video/quicktime";
    fileInput.style.display = "none";
    document.body.appendChild(fileInput);

    // Button Bar
    const bar = document.createElement("div");
    bar.style.cssText = "display: flex; align-items: center; margin-top: 10px; margin-bottom: 6px;";

    const mediaBtn = document.createElement("button");
    mediaBtn.type = "button";
    mediaBtn.id = "fuzzyMediaBtn";
    mediaBtn.innerHTML = "📷 / 🎥 <span style='font-size:14px; color:#e7e7e7;'>Add Image, GIF or Video</span>";
    mediaBtn.style.cssText = "background: #2a2a2a; border: 1px solid #3a3a3a; color: #fff; padding: 6px 14px; border-radius: 9999px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; font-size: 14px; transition: background 0.2s;";
    mediaBtn.onmouseover = () => mediaBtn.style.background = "#333";
    mediaBtn.onmouseout = () => mediaBtn.style.background = "#2a2a2a";

    bar.appendChild(mediaBtn);

    // Media Preview Box
    const previewBox = document.createElement("div");
    previewBox.id = "fuzzyPreviewBox";
    previewBox.style.cssText = "display: none; position: relative; margin-top: 8px; margin-bottom: 8px; text-align: center; background: #0d0d0d; padding: 8px; border-radius: 12px; border: 1px solid #2f2f2f;";

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.innerHTML = "✕";
    removeBtn.style.cssText = "position: absolute; top: 6px; right: 6px; background: rgba(249, 24, 24, 0.85); color: #fff; border: none; border-radius: 50%; width: 26px; height: 26px; cursor: pointer; font-weight: bold; font-size: 14px; z-index: 10;";

    previewBox.appendChild(removeBtn);

    modalContent.insertBefore(bar, modalBtns);
    modalContent.insertBefore(previewBox, modalBtns);

    mediaBtn.addEventListener("click", () => fileInput.click());

    fileInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file) {
        selectedFile = file;

        Array.from(previewBox.children).forEach(child => {
          if (child !== removeBtn) child.remove();
        });

        if (file.type.startsWith("image/")) {
          const img = document.createElement("img");
          img.style.cssText = "max-height: 180px; max-width: 100%; border-radius: 8px; object-fit: contain;";
          const reader = new FileReader();
          reader.onload = (ev) => { img.src = ev.target.result; };
          reader.readAsDataURL(file);
          previewBox.appendChild(img);
        } else if (file.type.startsWith("video/")) {
          const video = document.createElement("video");
          video.controls = true;
          video.style.cssText = "max-height: 200px; max-width: 100%; border-radius: 8px;";
          video.src = URL.createObjectURL(file);
          previewBox.appendChild(video);
        }

        previewBox.style.display = "block";
      }
    });

    function resetUploader() {
      selectedFile = null;
      fileInput.value = "";
      previewBox.style.display = "none";
      Array.from(previewBox.children).forEach(child => {
        if (child !== removeBtn) child.remove();
      });
    }

    removeBtn.addEventListener("click", resetUploader);
    const cancelPost = document.getElementById("cancelPost");
    if (cancelPost) cancelPost.addEventListener("click", resetUploader);
  }

  // 2. Upload Image or GIF to ImgBB
  async function uploadImageToImgBB(file) {
    const formData = new FormData();
    formData.append("image", file);
    const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
      method: "POST",
      body: formData
    });
    const data = await res.json();
    if (data && data.success) {
      return data.data.display_url || data.data.url;
    }
    throw new Error(data?.error?.message || "Image upload failed");
  }

  // 3. Direct Video Upload via Cloudinary API (Full CORS Support)
  async function uploadVideoToCloudinary(file) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "docs_upload_example_us_preset");

    const res = await fetch("https://api.cloudinary.com/v1_1/demo/auto/upload", {
      method: "POST",
      body: formData
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson?.error?.message || "Video upload failed");
    }

    const data = await res.json();
    if (data && data.secure_url) {
      return data.secure_url;
    }
    throw new Error("Could not retrieve video URL.");
  }

  // 4. Intercept Post Submit
  function interceptSubmit() {
    const submitBtn = document.getElementById("submitPost");
    if (!submitBtn || submitBtn.dataset.fuzzyHooked) return;

    submitBtn.dataset.fuzzyHooked = "true";

    submitBtn.addEventListener("click", async function (e) {
      if (isSubmitting) return;

      if (selectedFile) {
        e.stopImmediatePropagation();
        e.preventDefault();

        isSubmitting = true;
        const originalText = submitBtn.textContent;
        submitBtn.textContent = selectedFile.type.startsWith("video/") ? "Uploading video..." : "Uploading media...";
        submitBtn.disabled = true;

        try {
          let mediaUrl = "";
          if (selectedFile.type.startsWith("image/")) {
            mediaUrl = await uploadImageToImgBB(selectedFile);
          } else if (selectedFile.type.startsWith("video/")) {
            mediaUrl = await uploadVideoToCloudinary(selectedFile);
          }

          const postTextEl = document.getElementById("postText");
          if (postTextEl) {
            const currentVal = postTextEl.value.trim();
            postTextEl.value = currentVal ? `${currentVal}\n${mediaUrl}` : mediaUrl;
          }

          selectedFile = null;
          const previewBox = document.getElementById("fuzzyPreviewBox");
          if (previewBox) previewBox.style.display = "none";

          submitBtn.disabled = false;
          submitBtn.textContent = originalText;
          submitBtn.click();
        } catch (err) {
          alert("Error uploading media: " + err.message);
          submitBtn.disabled = false;
          submitBtn.textContent = originalText;
        } finally {
          isSubmitting = false;
        }
      }
    }, true);
  }

  // 5. Render Feed Images, GIFs, and HTML5 Videos
  function renderFeedMedia() {
    const posts = document.querySelectorAll(".post-body");

    posts.forEach((el) => {
      if (el.dataset.fuzzyMediaDone) return;

      let html = el.innerHTML;
      let modified = false;

      // Video Links (.mp4, .webm, .mov, Cloudinary Video URLs) -> Player
      const videoRegex = /(https?:\/\/[^\s<"']+(?:\.(?:mp4|webm|mov|m4v)|cloudinary\.com\/[^\s<"']+\/video\/upload\/)[^\s<"']*)/gi;
      if (videoRegex.test(html)) {
        html = html.replace(videoRegex, (url) => {
          return `<div style="margin-top:10px;"><video src="${url}" controls style="max-width:100%; max-height:400px; border-radius:12px; border:1px solid #2f2f2f; display:block; background:#000;" onerror="this.parentNode.innerHTML='<div style=\\'color:#ff5555; padding:8px; font-size:13px;\\'>Unable to play video</div>'"></video></div>`;
        });
        modified = true;
      }

      // Images & GIFs (.gif, .png, .jpg, .webp, ImgBB) -> View
      const imgRegex = /(https?:\/\/(?:i\.ibb\.co|ibb\.co|[^\s<"']+?\.(?:png|jpg|jpeg|gif|webp|svg))[^\s<"']*)/gi;
      if (imgRegex.test(html)) {
        html = html.replace(imgRegex, (url) => {
          return `<div style="margin-top:10px;"><a href="${url}" target="_blank" rel="noopener"><img src="${url}" style="max-width:100%; max-height:450px; border-radius:12px; border:1px solid #2f2f2f; display:block; object-fit:cover;" onerror="this.parentNode.style.display='none'" /></a></div>`;
        });
        modified = true;
      }

      if (modified) {
        el.dataset.fuzzyMediaDone = "true";
        el.innerHTML = html;
      }
    });
  }

  function init() {
    setupMediaUploaderUI();
    interceptSubmit();
    renderFeedMedia();

    const observer = new MutationObserver(() => {
      setupMediaUploaderUI();
      interceptSubmit();
      renderFeedMedia();
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();