"use strict";

// Firebase JS SDK dạng ES Module, tải trực tiếp từ CDN của Firebase.
import { app, auth, db, initializeFirebase, provider, storage } from "./firebase-config.js";
import { getAnalytics, isSupported } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-analytics.js";
import {
  arrayUnion,
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytesResumable
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-storage.js";
import {
  getRedirectResult,
  onAuthStateChanged,
  signInWithPopup,
  signOut
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

const LEGACY_STORAGE_KEY = "raglai-heritage-posts";
const MAX_FILE_SIZES = {
  image: 5 * 1024 * 1024,
  audio: 10 * 1024 * 1024,
  video: 20 * 1024 * 1024
};
const MAX_INLINE_IMAGE_SIZE = 2 * 1024 * 1024;
const MAX_FIRESTORE_POST_SIZE_BYTES = 900 * 1024;
const AUDIO_TOO_LARGE_MESSAGE =
  "Tệp ghi âm quá lớn! Vui lòng chọn file ghi âm có dung lượng dưới 10MB.";
const MAX_AVATAR_SIZE = 2 * 1024 * 1024;
const MAX_POSTS_PER_USER = 15;
const ADMIN_EMAILS = [
  "vothanhtra0812@gmail.com",
  "nguyenthuong250112011@gmail.com"
];
const MAX_VIOLATIONS = 5;
const USERNAME_CHANGE_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_ATTACHMENTS_PER_POST = 20;
const ADMIN_AVATAR_URL = "./admin-avatar.svg";
const BLOCKED_TERMS = [
  "địt", "đéo", "đụ", "cặc", "lồn", "buồi", "đĩ", "đồ ngu", "thằng ngu",
  "con ngu", "đồ chó", "đồ khốn", "đồ súc vật", "mất dạy", "chết tiệt",
  "đồ mất dạy", "đồ điên", "đồ vô học", "đồ khốn nạn", "giết người",
  "tự tử", "ma túy", "khủng bố", "đánh bom", "bạo lực", "bắt nạt", "kỳ thị"
];
const CATEGORIES = {
  news: "Tin tức sự kiện",
  heritage: "Em và di sản quê hương",
  language: "Ngôn ngữ dân tộc Raglai",
  customs: "Phong tục, lễ hội",
  tradition: "Phong tục, lễ hội",
  instruments: "Nhạc cụ truyền thống",
  clothing: "Trang phục dân tộc",
  food: "Ẩm thực",
  "folk-knowledge": "Tri thức dân gian",
  "other-ethnicities": "Các dân tộc khác",
  literature: "Trang, văn thơ",
  faq: "Câu hỏi thường gặp"
};
const CATEGORY_ALIASES = {
  tradition: "customs"
};

const form = document.getElementById("post-form");
const titleInput = document.getElementById("post-title");
const categoryInput = document.getElementById("post-category");
const contentInput = document.getElementById("post-content");
const imageInput = document.getElementById("image-files");
const videoInput = document.getElementById("video-files");
const audioInput = document.getElementById("audio-files");
const recordButton = document.getElementById("record-button");
const recordingStatus = document.getElementById("recording-status");
const authStatus = document.getElementById("auth-status");
const authRequiredPanel = document.getElementById("auth-required-panel");
const authControls = document.getElementById("auth-controls");
const loginBtn = document.getElementById("login-btn");
const signOutButton = document.getElementById("sign-out");
const signedInProfile = document.getElementById("signed-in-profile");
const signedInAvatar = document.getElementById("signed-in-avatar");
const signedInName = document.getElementById("signed-in-name");
const signedInAdminBadge = document.getElementById("signed-in-admin-badge");
const openOwnProfileButton = document.getElementById("open-own-profile");
const accountBanNotice = document.getElementById("account-ban-notice");
const memberTools = document.getElementById("member-tools");
const postCountLabel = document.getElementById("post-count");
const violationCountLabel = document.getElementById("violation-count");
const displayNameForm = document.getElementById("display-name-form");
const displayNameInput = document.getElementById("display-name-input");
const saveDisplayNameButton = document.getElementById("save-display-name");
const usernameStatus = document.getElementById("username-status");
const avatarInput = document.getElementById("avatar-file");
const avatarStatus = document.getElementById("avatar-status");
const formStatus = document.getElementById("form-status");
const submitButton = document.getElementById("submit-button");
const previewSection = document.getElementById("preview-section");
const previewList = document.getElementById("preview-list");
const postsList = document.getElementById("posts-list");
const postsSection = document.getElementById("posts-section");
const composerSection = document.querySelector(".composer");
const profilePage = document.getElementById("profile-page");
const closeProfilePageButton = document.getElementById("close-profile-page");
const profilePageTitle = document.getElementById("profile-page-title");
const profilePageStatus = document.getElementById("profile-page-status");
const privateProfileMessage = document.getElementById("private-profile-message");
const profilePageContent = document.getElementById("profile-page-content");
const profilePageAvatar = document.getElementById("profile-page-avatar");
const profilePageName = document.getElementById("profile-page-name");
const profileAdminBadge = document.getElementById("profile-admin-badge");
const profilePageEmail = document.getElementById("profile-page-email");
const privacySettingsForm = document.getElementById("privacy-settings-form");
const profileVisibilityInput = document.getElementById("profile-visibility");
const hideLikedPostsInput = document.getElementById("hide-liked-posts");
const privacySettingsStatus = document.getElementById("privacy-settings-status");
const savePrivacySettingsButton = document.getElementById("save-privacy-settings");
const profilePostsHeading = document.getElementById("profile-posts-title");
const profilePostsList = document.getElementById("profile-posts-list");
const profileLikesHidden = document.getElementById("profile-likes-hidden");
const profileLikesList = document.getElementById("profile-likes-list");
const profileCommentsList = document.getElementById("profile-comments-list");
const homeLink = document.getElementById("home-link");
const categoryLinks = Array.from(document.querySelectorAll(".category-nav [data-category]"));

const adminMemberPanel = document.createElement("section");
adminMemberPanel.className = "admin-member-panel panel";
adminMemberPanel.hidden = true;
const adminMemberTitle = document.createElement("h2");
adminMemberTitle.textContent = "Quản lý thành viên";
const adminMemberDescription = document.createElement("p");
adminMemberDescription.textContent =
  "Khóa tài khoản sẽ chặn đăng bài và ẩn bài viết; mở khóa sẽ khôi phục quyền đăng và hiển thị.";
const adminMemberStatus = document.createElement("p");
adminMemberStatus.className = "form-status";
adminMemberStatus.setAttribute("role", "status");
const adminMemberList = document.createElement("div");
adminMemberList.className = "admin-member-list";
adminMemberPanel.append(
  adminMemberTitle,
  adminMemberDescription,
  adminMemberStatus,
  adminMemberList
);
postsSection.parentNode.insertBefore(adminMemberPanel, postsSection);

function isAdminUser(user) {
  const email = user && typeof user.email === "string" ? user.email.trim().toLowerCase() : "";
  return ADMIN_EMAILS.some(function (adminEmail) {
    return adminEmail.trim().toLowerCase() === email;
  });
}

let firebaseReady = false;
let currentUser = null;
let profileReady = false;
let currentProfileUnsubscribe = null;
let currentPostCount = 0;
let currentViolationCount = 0;
let currentUserBanned = false;
let isUpdatingDisplayName = false;
let posts = [];
let currentCategory = null;
let isSubmitting = false;
let isMigrating = false;
let pendingRecording = null;
let recorder = null;
let activeStream = null;
let isFinalizingRecording = false;
let previewUrls = [];
let activeProfileId = null;
let activeProfileIsOwner = false;
let profileRequestId = 0;
const interactionState = new Map();
const interactionUnsubscribers = new Map();
const profileCache = new Map();
const profileUnsubscribers = new Map();
const bannedUserIds = new Set();
const adminBanSyncInProgress = new Set();
let bannedUsersUnsubscribe = null;
let adminUsersUnsubscribe = null;
let bannedUsersLoaded = false;
let adminMembers = [];

function showStatus(message, isError, isSuccess) {
  formStatus.textContent = message;
  formStatus.classList.toggle("is-error", Boolean(isError));
  formStatus.classList.toggle("is-success", Boolean(isSuccess));
}

function setAdminMemberStatus(message, isError) {
  adminMemberStatus.textContent = message;
  adminMemberStatus.classList.toggle("is-error", Boolean(isError));
  adminMemberStatus.classList.toggle("is-success", Boolean(message) && !isError);
}

function renderAdminMembers(members) {
  adminMemberList.replaceChildren();
  if (!isAdminUser(auth && auth.currentUser)) {
    adminMemberPanel.hidden = true;
    return;
  }
  adminMemberPanel.hidden = false;
  if (members.length === 0) {
    const empty = document.createElement("p");
    empty.className = "profile-muted";
    empty.textContent = "Chưa có hồ sơ thành viên.";
    adminMemberList.appendChild(empty);
    return;
  }

  members.slice().sort(function (first, second) {
    return (first.displayName || first.uid).localeCompare(second.displayName || second.uid);
  }).forEach(function (member) {
    const row = document.createElement("article");
    row.className = "profile-list-item admin-member-row";

    const details = document.createElement("div");
    details.className = "profile-list-item-text";
    const name = document.createElement("h3");
    const isCurrentAdmin = Boolean(currentUser
      && member.uid === currentUser.uid
      && isAdminUser(currentUser));
    name.textContent = isCurrentAdmin ? "Admin" : member.displayName || "Thành viên";
    if (isCurrentAdmin) {
      const ownerBadge = document.createElement("span");
      ownerBadge.className = "admin-role-badge";
      ownerBadge.textContent = "Chủ Web";
      name.appendChild(ownerBadge);
    }
    const status = document.createElement("p");
    status.textContent = (member.isBanned ? "Đã bị khóa" : "Đang hoạt động")
      + " · Vi phạm: " + member.violationCount + "/" + MAX_VIOLATIONS
      + " · UID: " + member.uid;
    details.append(name, status);
    row.appendChild(details);

    const button = document.createElement("button");
    button.className = member.isBanned
      ? "button button-admin-unlock"
      : "button button-admin-lock";
    button.type = "button";
    button.textContent = member.isBanned ? "Mở khóa tài khoản" : "Khóa tài khoản";
    button.addEventListener("click", function () {
      if (!isAdminUser(auth && auth.currentUser)) {
        return;
      }
      const nextBannedState = !member.isBanned;
      const action = nextBannedState ? "khóa" : "mở khóa";
      if (window.confirm("Bạn có chắc muốn " + action + " tài khoản này?")) {
        setMemberBanned(member.uid, nextBannedState, button);
      }
    });
    row.appendChild(button);
    adminMemberList.appendChild(row);
  });
}

function syncAdminBanRegistry(member) {
  if (!bannedUsersLoaded) {
    return;
  }
  const shouldBeBanned = member.isBanned === true;
  if (shouldBeBanned === bannedUserIds.has(member.uid)
    || adminBanSyncInProgress.has(member.uid)) {
    return;
  }

  adminBanSyncInProgress.add(member.uid);
  const banRef = doc(db, "bannedUsers", member.uid);
  const sync = shouldBeBanned
    ? setDoc(banRef, { uid: member.uid, bannedAt: serverTimestamp() }, { merge: true })
    : deleteDoc(banRef);
  sync.catch(function (error) {
    console.error("Không thể đồng bộ danh sách tài khoản bị khóa:", error);
    setAdminMemberStatus("Không thể đồng bộ UID " + member.uid + ": " + error.message, true);
  }).finally(function () {
    adminBanSyncInProgress.delete(member.uid);
  });
}

function subscribeToBannedUsers() {
  if (bannedUsersUnsubscribe) {
    bannedUsersUnsubscribe();
  }
  bannedUsersUnsubscribe = onSnapshot(collection(db, "bannedUsers"), function (snapshot) {
    bannedUsersLoaded = true;
    bannedUserIds.clear();
    snapshot.docs.forEach(function (documentSnapshot) {
      bannedUserIds.add(documentSnapshot.id);
    });
    adminMembers.forEach(syncAdminBanRegistry);
    renderPosts();
    if (activeProfileId) {
      const profile = profileCache.get(activeProfileId) || {};
      renderProfilePosts(
        activeProfileId,
        Number.isInteger(profile.postCount) ? profile.postCount : 0,
        activeProfileIsOwner
      );
    }
  }, function (error) {
    console.error("Không thể tải danh sách tài khoản bị khóa:", error);
    postsList.replaceChildren();
    const message = document.createElement("p");
    message.className = "empty-state";
    message.textContent =
      "Không thể kiểm tra trạng thái tài khoản. Vui lòng tải lại trang: " + error.message;
    postsList.appendChild(message);
  });
}

function subscribeToAdminMembers(user) {
  if (adminUsersUnsubscribe) {
    adminUsersUnsubscribe();
    adminUsersUnsubscribe = null;
  }
  if (!isAdminUser(user)) {
    adminMembers = [];
    adminMemberList.replaceChildren();
    return;
  }

  adminUsersUnsubscribe = onSnapshot(collection(db, "users"), function (snapshot) {
    adminMembers = snapshot.docs.map(function (documentSnapshot) {
      const profile = documentSnapshot.data();
      return {
        uid: documentSnapshot.id,
        displayName: profile.displayName || "",
        postCount: Number.isInteger(profile.postCount) ? profile.postCount : 0,
        violationCount: Number.isInteger(profile.violationCount) ? profile.violationCount : 0,
        isBanned: profile.isBanned === true
      };
    });
    adminMembers.forEach(syncAdminBanRegistry);
    renderAdminMembers(adminMembers);
    setAdminMemberStatus("Đã tải " + adminMembers.length + " hồ sơ thành viên.", false);
  }, function (error) {
    console.error("Không thể tải danh sách thành viên:", error);
    setAdminMemberStatus("Không thể tải thành viên: " + error.message, true);
  });
}

async function setMemberBanned(userId, shouldBeBanned, button) {
  const adminUser = auth && auth.currentUser;
  if (!isAdminUser(adminUser)
    || !userId) {
    return;
  }

  button.disabled = true;
  adminBanSyncInProgress.add(userId);
  setAdminMemberStatus(shouldBeBanned ? "Đang khóa tài khoản..." : "Đang mở khóa tài khoản.", false);
  const profileRef = doc(db, "users", userId);
  const banRef = doc(db, "bannedUsers", userId);
  try {
    await runTransaction(db, async function (transaction) {
      const profileSnapshot = await transaction.get(profileRef);
      const banSnapshot = await transaction.get(banRef);
      if (!profileSnapshot.exists()) {
        throw new Error("Không tìm thấy hồ sơ thành viên.");
      }

      const profile = profileSnapshot.data();
      const violationCount = Number.isInteger(profile.violationCount)
        ? profile.violationCount
        : 0;
      if (shouldBeBanned) {
        if (profile.isBanned !== true) {
          transaction.update(profileRef, {
            isBanned: true,
            violationCount: violationCount,
            updatedAt: serverTimestamp()
          });
        }
        if (!banSnapshot.exists()) {
          transaction.set(banRef, { uid: userId, bannedAt: serverTimestamp() });
        }
      } else {
        if (profile.isBanned === true || violationCount !== 0) {
          transaction.update(profileRef, {
            isBanned: false,
            violationCount: 0,
            updatedAt: serverTimestamp()
          });
        }
        if (banSnapshot.exists()) {
          transaction.delete(banRef);
        }
      }
    });
    setAdminMemberStatus(
      shouldBeBanned ? "Đã khóa tài khoản." : "Đã mở khóa tài khoản.",
      false
    );
  } catch (error) {
    setAdminMemberStatus("Không thể cập nhật tài khoản: " + error.message, true);
  } finally {
    adminBanSyncInProgress.delete(userId);
    button.disabled = false;
  }
}

function setRecordingStatus(message, isRecording) {
  recordingStatus.textContent = message;
  recordingStatus.classList.toggle("is-recording", Boolean(isRecording));
}

function showAudioTooLarge() {
  showStatus(AUDIO_TOO_LARGE_MESSAGE, true);
  setRecordingStatus(AUDIO_TOO_LARGE_MESSAGE, false);
}

function clearAudioTooLargeStatus() {
  if (formStatus.textContent === AUDIO_TOO_LARGE_MESSAGE) {
    showStatus("", false);
  }
  if (recordingStatus.textContent === AUDIO_TOO_LARGE_MESSAGE) {
    setRecordingStatus("Cho phép trình duyệt sử dụng micro khi được hỏi.", false);
  }
}

function getCurrentDisplayName() {
  const profile = currentUser && profileCache.get(currentUser.uid);
  return (profile && profile.displayName)
    || (currentUser && currentUser.displayName)
    || (currentUser && currentUser.email)
    || "Thành viên";
}

function updateAuthControls(user) {
  if (typeof user !== "undefined") {
    currentUser = user;
  }
  const signedIn = Boolean(currentUser);
  const isAdmin = isAdminUser(currentUser);
  adminMemberPanel.hidden = !signedIn || !isAdmin || !profilePage.hidden;
  authStatus.textContent = firebaseReady
    ? "Bạn cần đăng nhập bằng Google để đăng bài viết."
    : "Không thể kết nối Firebase. Vui lòng thử lại sau.";
  authRequiredPanel.hidden = signedIn;
  authControls.hidden = !signedIn;
  form.hidden = !signedIn;
  signedInProfile.hidden = !signedIn;
  signedInName.textContent = signedIn
    ? (isAdmin ? "Admin" : getCurrentDisplayName())
    : "";
  signedInProfile.classList.toggle("is-admin", signedIn && isAdmin);
  signedInAdminBadge.hidden = !signedIn || !isAdmin;
  const profile = signedIn ? profileCache.get(currentUser.uid) || {} : {};
  const avatarURL = isAdmin
    ? ADMIN_AVATAR_URL
    : profile.avatarURL || profile.photoURL
      || (signedIn && currentUser.photoURL)
      || "";
  signedInAvatar.hidden = !avatarURL;
  signedInAvatar.classList.toggle("admin-avatar", signedIn && isAdmin);
  if (avatarURL) {
    signedInAvatar.src = avatarURL;
  } else {
    signedInAvatar.removeAttribute("src");
  }
  if (loginBtn) {
    loginBtn.hidden = !firebaseReady || signedIn;
  }
  signOutButton.hidden = !signedIn;
  openOwnProfileButton.hidden = !signedIn;
  memberTools.hidden = !signedIn || !profileReady
    || profilePage.hidden || !activeProfileIsOwner;
  accountBanNotice.hidden = !signedIn || !currentUserBanned;
  postCountLabel.textContent = "Số bài của bạn: " + currentPostCount + "/"
    + (isAdmin ? "∞" : MAX_POSTS_PER_USER);
  violationCountLabel.textContent =
    "Số lần vi phạm: " + currentViolationCount + "/" + MAX_VIOLATIONS;
  const formLocked = !firebaseReady || !signedIn || !profileReady
    || currentUserBanned || isSubmitting || isMigrating;
  form.querySelectorAll("input, textarea, select, button").forEach(function (control) {
    control.disabled = formLocked;
  });
  submitButton.disabled = formLocked
    || (!isAdmin && currentPostCount >= MAX_POSTS_PER_USER);
  displayNameInput.disabled = !signedIn || !profileReady || currentUserBanned;
  saveDisplayNameButton.disabled = !signedIn || !profileReady
    || currentUserBanned || isUpdatingDisplayName;
  avatarInput.disabled = !signedIn || !profileReady || currentUserBanned;
  if (signedIn && currentUserBanned) {
    formStatus.textContent = "Tài khoản của bạn đang bị khóa. Vui lòng liên hệ quản trị viên.";
    formStatus.classList.add("is-error");
    formStatus.classList.remove("is-success");
  } else if (signedIn && !isAdmin && currentPostCount >= MAX_POSTS_PER_USER) {
    formStatus.textContent = "Bạn đã đạt giới hạn 15 bài viết.";
    formStatus.classList.add("is-error");
    formStatus.classList.remove("is-success");
  }
}

signedInAvatar.addEventListener("error", function () {
  signedInAvatar.hidden = true;
});

async function checkRedirectLogin() {
  try {
    const result = await getRedirectResult(auth);
    if (!result || !result.user) {
      return;
    }

    const user = result.user;
    currentUser = user;
    console.log("Đăng nhập thành công:", user);
    try {
      await saveAuthMetadata(user);
    } catch (error) {
      console.error("Không thể lưu thông tin đăng nhập:", error);
      showStatus("Đăng nhập thành công nhưng không thể lưu thông tin tài khoản: "
        + error.message, true);
      updateAuthControls(user);
      return;
    }

    showStatus(
      isAdminUser(user)
        ? "Đăng nhập Admin thành công."
        : "Đăng nhập thành công.",
      false,
      true
    );
    updateAuthControls(user);
  } catch (error) {
    console.error("Lỗi getRedirectResult:", error);
    authStatus.textContent = "Không thể đăng nhập bằng Google: " + error.message;
    showStatus("Không thể đăng nhập: " + error.message, true);
  }
}

function saveAuthMetadata(user) {
  return setDoc(doc(db, "users", user.uid, "private", "auth"), {
    uid: user.uid,
    email: user.email || "",
    displayName: user.displayName || "",
    photoURL: user.photoURL || "",
    lastLogin: serverTimestamp()
  }, { merge: true });
}

// Khởi tạo Firebase App, Firestore, Storage, Authentication và Analytics.
try {
  initializeFirebase();
  firebaseReady = true;
  checkRedirectLogin();

  isSupported()
    .then(function (supported) {
      if (supported) {
        getAnalytics(app);
      }
    })
    .catch(function (error) {
      console.warn("Không thể khởi tạo Firebase Analytics:", error);
    });
} catch (error) {
  authStatus.textContent = "Không thể khởi tạo Firebase.";
  showStatus("Lỗi khởi tạo Firebase: " + error.message, true);
  console.error("Firebase initialization failed:", error);
}

// Tập hợp các tệp được chọn và bản ghi âm đang chờ đăng.
function collectAttachments() {
  const attachments = [];
  [
    { input: imageInput, kind: "image" },
    { input: videoInput, kind: "video" },
    { input: audioInput, kind: "audio" }
  ].forEach(function (field) {
    Array.from(field.input.files).forEach(function (file) {
      attachments.push({ name: file.name, type: file.type, kind: field.kind, blob: file });
    });
  });

  if (pendingRecording) {
    attachments.push({
      name: pendingRecording.name,
      type: pendingRecording.type,
      kind: "audio",
      blob: pendingRecording.blob
    });
  }
  return attachments;
}

function readFileAsDataUrl(file) {
  if (file.size >= MAX_INLINE_IMAGE_SIZE) {
    return Promise.reject(new Error(
      "Ảnh \"" + file.name + "\" phải có dung lượng dưới 2 MB."
    ));
  }

  return new Promise(function (resolve, reject) {
    const reader = new FileReader();
    reader.onload = function () {
      if (typeof reader.result !== "string") {
        reject(new Error("Không thể chuyển ảnh \"" + file.name + "\" sang Base64."));
        return;
      }
      resolve(reader.result);
    };
    reader.onerror = function () {
      reject(reader.error || new Error("Không thể đọc ảnh \"" + file.name + "\"."));
    };
    reader.readAsDataURL(file);
  });
}

function createMediaElement(attachment, source) {
  let element;
  if (attachment.kind === "image") {
    element = document.createElement("img");
    element.alt = attachment.name || "Hình ảnh đính kèm";
    element.loading = "lazy";
  } else if (attachment.kind === "video") {
    element = document.createElement("video");
    element.controls = true;
    element.preload = "metadata";
  } else {
    element = document.createElement("audio");
    element.controls = true;
    element.preload = "metadata";
  }
  element.src = source;
  return element;
}

function addMediaItem(container, attachment, source) {
  const item = document.createElement("div");
  item.className = "media-item";
  item.appendChild(createMediaElement(attachment, source));

  const name = document.createElement("p");
  name.className = "media-name";
  name.textContent = attachment.name || "Tệp đính kèm";
  item.appendChild(name);
  container.appendChild(item);
}

// Hiển thị ảnh/âm thanh/video đã chọn trước khi đăng bài.
function renderPreview() {
  previewUrls.forEach(function (url) {
    URL.revokeObjectURL(url);
  });
  previewUrls = [];
  previewList.replaceChildren();

  const attachments = collectAttachments();
  previewSection.hidden = attachments.length === 0;
  attachments.forEach(function (attachment) {
    const url = URL.createObjectURL(attachment.blob);
    previewUrls.push(url);
    addMediaItem(previewList, attachment, url);
  });
}

function formatDate(timestamp) {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "long",
    timeStyle: "short"
  }).format(new Date(timestamp));
}

function containsBlockedLanguage(text) {
  const normalize = function (value) {
    return value
      .toLocaleLowerCase("vi")
      .normalize("NFC")
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .trim();
  };
  const normalized = normalize(text);
  return BLOCKED_TERMS.some(function (term) {
    return (" " + normalized + " ").includes(" " + normalize(term) + " ");
  });
}

function getPublicProfile(userId, fallbackName, fallbackPhotoURL) {
  const profile = profileCache.get(userId) || {};
  const isAdmin = fallbackName === "Admin";
  return {
    isAdmin: isAdmin,
    name: isAdmin
      ? "Admin"
      : profile.displayName || fallbackName || "Thành viên",
    avatarURL: isAdmin
      ? ADMIN_AVATAR_URL
      : profile.avatarURL || profile.photoURL || fallbackPhotoURL || ""
  };
}

function createAuthorBadge(userId, fallbackName, fallbackPhotoURL) {
  const profile = getPublicProfile(userId, fallbackName, fallbackPhotoURL);
  const badge = document.createElement("button");
  badge.className = "person-badge profile-link";
  badge.type = "button";
  badge.disabled = !userId;
  badge.addEventListener("click", function () {
    if (userId) {
      openProfile(userId);
    }
  });
  if (profile.avatarURL) {
    const avatar = document.createElement("img");
    avatar.className = "person-avatar";
    avatar.classList.toggle("admin-avatar", profile.isAdmin);
    avatar.src = profile.avatarURL;
    avatar.alt = "";
    avatar.loading = "lazy";
    avatar.referrerPolicy = "no-referrer";
    badge.appendChild(avatar);
  }
  const name = document.createElement("span");
  name.textContent = profile.name;
  badge.appendChild(name);
  if (profile.isAdmin) {
    const ownerBadge = document.createElement("span");
    ownerBadge.className = "admin-role-badge";
    ownerBadge.textContent = "Chủ Web";
    badge.appendChild(ownerBadge);
    badge.classList.add("admin-person-badge");
  }
  return badge;
}

function ensureInteractionSubscriptions() {
  const postIds = new Set(posts.map(function (post) { return post.id; }));
  interactionUnsubscribers.forEach(function (unsubscribers, postId) {
    if (!postIds.has(postId)) {
      unsubscribers.forEach(function (unsubscribe) { unsubscribe(); });
      interactionUnsubscribers.delete(postId);
      interactionState.delete(postId);
    }
  });
  posts.forEach(function (post) {
    if (interactionUnsubscribers.has(post.id)) {
      return;
    }
    interactionState.set(post.id, { likes: [], comments: [] });
    const unsubscribers = [
      onSnapshot(collection(db, "posts", post.id, "likes"), function (snapshot) {
        const state = interactionState.get(post.id);
        if (state) {
          state.likes = snapshot.docs.map(function (item) {
            return Object.assign({ id: item.id }, item.data());
          });
          renderPosts();
        }
      }, function (error) {
        console.error("Không thể tải lượt thả tim:", error);
      }),
      onSnapshot(query(collection(db, "posts", post.id, "comments"), orderBy("createdAt", "asc")), function (snapshot) {
        const state = interactionState.get(post.id);
        if (state) {
          state.comments = snapshot.docs.map(function (item) {
            const data = item.data({ serverTimestamps: "estimate" });
            return Object.assign({ id: item.id }, data, {
              createdAt: data.createdAt && typeof data.createdAt.toMillis === "function"
                ? data.createdAt.toMillis()
                : Date.now()
            });
          });
          ensureProfileSubscriptions();
          renderPosts();
        }
      }, function (error) {
        console.error("Không thể tải bình luận:", error);
      })
    ];
    interactionUnsubscribers.set(post.id, unsubscribers);
  });
}

function ensureProfileSubscriptions() {
  const userIds = new Set();
  if (currentUser) {
    userIds.add(currentUser.uid);
  }
  posts.forEach(function (post) {
    if (post.userId) {
      userIds.add(post.userId);
    }
    const state = interactionState.get(post.id);
    if (state) {
      state.likes.concat(state.comments).forEach(function (entry) {
        if (entry.userId) {
          userIds.add(entry.userId);
        }
      });
    }
  });
  profileUnsubscribers.forEach(function (unsubscribe, userId) {
    if (!userIds.has(userId)) {
      unsubscribe();
      profileUnsubscribers.delete(userId);
      profileCache.delete(userId);
    }
  });
  userIds.forEach(function (userId) {
    if (!profileUnsubscribers.has(userId)) {
      const unsubscribe = onSnapshot(doc(db, "users", userId), function (snapshot) {
        profileCache.set(userId, snapshot.exists() ? snapshot.data() : {});
        renderPosts();
      }, function (error) {
        console.error("Không thể tải hồ sơ thành viên:", error);
      });
      profileUnsubscribers.set(userId, unsubscribe);
    }
  });
}

async function toggleLike(post, button) {
  if (!currentUser) {
    showStatus("Hãy đăng nhập bằng Google để thả tim.", true);
    return;
  }
  if (!profileReady) {
    showStatus("Hồ sơ tài khoản đang được tải. Vui lòng thử lại.", true);
    return;
  }
  if (currentUserBanned) {
    showStatus("Tài khoản của bạn đã bị khóa vĩnh viễn.", true);
    return;
  }
  button.disabled = true;
  const likeRef = doc(db, "posts", post.id, "likes", currentUser.uid);
  try {
    const existing = await getDoc(likeRef);
    if (existing.exists()) {
      await deleteDoc(likeRef);
    } else {
      await setDoc(likeRef, {
        userId: currentUser.uid,
        displayName: getCurrentDisplayName(),
        photoURL: currentUser.photoURL || "",
        createdAt: serverTimestamp()
      });
    }
  } catch (error) {
    showStatus("Không thể cập nhật lượt thả tim: " + error.message, true);
  } finally {
    button.disabled = false;
  }
}

async function addComment(post, authorName, content, button, statusTarget) {
  if (!currentUser) {
    showStatus("Hãy đăng nhập bằng Google để bình luận.", true);
    return false;
  }
  if (!profileReady) {
    showStatus("Hồ sơ tài khoản đang được tải. Vui lòng thử lại.", true);
    return false;
  }
  if (currentUserBanned) {
    showStatus("Tài khoản của bạn đã bị khóa vĩnh viễn.", true);
    return false;
  }
  const name = authorName.trim();
  const text = content.trim();
  if (!name || name.length > 60) {
    statusTarget.textContent = "Tên hiển thị phải có từ 1 đến 60 ký tự.";
    statusTarget.classList.add("is-error");
    statusTarget.classList.remove("is-success");
    return false;
  }
  if (!text) {
    statusTarget.textContent = "Vui lòng nhập nội dung bình luận.";
    statusTarget.classList.add("is-error");
    statusTarget.classList.remove("is-success");
    return false;
  }
  if (containsBlockedLanguage(name) || containsBlockedLanguage(text)) {
    return rejectInappropriateContent(statusTarget);
  }
  button.disabled = true;
  try {
    await setDoc(doc(collection(db, "posts", post.id, "comments")), {
      userId: currentUser.uid,
      authorName: name,
      authorPhotoURL: currentUser.photoURL || "",
      content: text,
      createdAt: serverTimestamp()
    });
    showStatus("Đã gửi bình luận.", false, true);
    return true;
  } catch (error) {
    showStatus("Không thể gửi bình luận: " + error.message, true);
    return false;
  } finally {
    button.disabled = false;
  }
}

function updateCategoryNavigation() {
  categoryLinks.forEach(function (link) {
    if ((link.dataset.category || null) === currentCategory) {
      link.setAttribute("aria-current", "page");
    } else {
      link.removeAttribute("aria-current");
    }
  });
}

// Hiển thị bài viết theo bộ lọc; dữ liệu bài viết được đồng bộ thời gian thực từ Firestore.
function renderPosts() {
  postsList.replaceChildren();
  if (firebaseReady && !bannedUsersLoaded) {
    const loading = document.createElement("p");
    loading.className = "empty-state";
    loading.textContent = "Đang kiểm tra trạng thái tài khoản...";
    postsList.appendChild(loading);
    return;
  }
  if (firebaseReady) {
    ensureInteractionSubscriptions();
    ensureProfileSubscriptions();
  }
  const visiblePosts = posts
    .filter(function (post) {
      const hiddenByCurrentUser = currentUser
        && post.hiddenBy.indexOf(currentUser.uid) !== -1;
      const authorProfile = profileCache.get(post.userId) || {};
      const authorIsBanned = post.userId
        && (bannedUserIds.has(post.userId) || authorProfile.isBanned === true);
      return !hiddenByCurrentUser
        && !authorIsBanned
        && (!currentCategory
          || (CATEGORY_ALIASES[post.category] || post.category) === currentCategory);
    })
    .sort(function (first, second) {
      return second.createdAt - first.createdAt;
    });

  if (visiblePosts.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = currentCategory
      ? "Chưa có bài viết nào trong chuyên mục này."
      : "Chưa có bài viết nào. Hãy chia sẻ câu chuyện đầu tiên!";
    postsList.appendChild(empty);
    return;
  }

  visiblePosts.forEach(function (post) {
    const card = document.createElement("article");
    card.className = "post-card";

    const header = document.createElement("div");
    header.className = "post-card-header";
    const headingGroup = document.createElement("div");

    const category = document.createElement("p");
    category.className = "post-category";
    category.textContent = CATEGORIES[post.category] || "Chuyên mục không xác định";

    const heading = document.createElement("h3");
    heading.textContent = post.title;
    const date = document.createElement("p");
    date.className = "post-date";
    date.textContent = formatDate(post.createdAt);
    headingGroup.append(category, heading, date);

    const author = document.createElement("div");
    author.className = "post-author";
    author.append("Tác giả: ", createAuthorBadge(post.userId, post.authorName, post.authorPhotoURL));
    headingGroup.appendChild(author);

    const headerItems = [headingGroup];
    if (currentUser && !currentUserBanned
      && (post.userId === currentUser.uid || isAdminUser(currentUser))) {
      const editButton = document.createElement("button");
      editButton.className = "edit-post-button";
      editButton.type = "button";
      editButton.textContent = "Sửa";
      editButton.setAttribute("aria-label", "Sửa bài viết: " + post.title);
      editButton.addEventListener("click", function () {
        editPost(post, editButton);
      });
      headerItems.push(editButton);

      const deleteButton = document.createElement("button");
      deleteButton.className = "delete-button";
      deleteButton.type = "button";
      deleteButton.textContent = "Xóa";
      deleteButton.setAttribute("aria-label", "Xóa bài viết: " + post.title);
      deleteButton.addEventListener("click", function () {
        deletePost(post, deleteButton);
      });
      headerItems.push(deleteButton);
    }
    if (currentUser) {
      const hideButton = document.createElement("button");
      hideButton.className = "hide-post-button";
      hideButton.type = "button";
      hideButton.textContent = "Ẩn bài viết";
      hideButton.setAttribute("aria-label", "Ẩn bài viết: " + post.title);
      hideButton.addEventListener("click", function () {
        hidePost(post, hideButton);
      });
      headerItems.push(hideButton);
    }

    header.append.apply(header, headerItems);
    card.appendChild(header);

    const content = document.createElement("p");
    content.className = "post-content";
    content.textContent = post.content;
    card.appendChild(content);

    const postMedia = post.imageUrl
      ? [{ name: "Hình ảnh", kind: "image", url: post.imageUrl }].concat(post.attachments)
      : post.attachments;
    if (postMedia.length > 0) {
      const media = document.createElement("div");
      media.className = "post-media";
      postMedia.forEach(function (attachment) {
        addMediaItem(media, attachment, attachment.url);
      });
      card.appendChild(media);
    }

    const state = interactionState.get(post.id) || { likes: [], comments: [] };
    const interactions = document.createElement("section");
    interactions.className = "post-interactions";
    const likeButton = document.createElement("button");
    likeButton.className = "like-button";
    likeButton.type = "button";
    likeButton.disabled = currentUserBanned || Boolean(currentUser && !profileReady);
    const likedByCurrentUser = Boolean(currentUser && state.likes.some(function (like) {
      return like.userId === currentUser.uid;
    }));
    likeButton.textContent = (likedByCurrentUser ? "♥ Đã thả tim (" : "♡ Thả tim (")
      + state.likes.length + ")";
    likeButton.setAttribute("aria-pressed", String(likedByCurrentUser));
    likeButton.addEventListener("click", function () { toggleLike(post, likeButton); });
    interactions.appendChild(likeButton);

    if (state.likes.length > 0) {
      const likers = document.createElement("div");
      likers.className = "liker-list";
      state.likes.forEach(function (like) {
        likers.appendChild(createAuthorBadge(like.userId, like.displayName, like.photoURL));
      });
      interactions.appendChild(likers);
    }

    const commentsSection = document.createElement("div");
    commentsSection.className = "comments-section";
    const commentsHeading = document.createElement("h4");
    commentsHeading.textContent = "Bình luận (" + state.comments.length + ")";
    commentsSection.appendChild(commentsHeading);
    const commentsList = document.createElement("div");
    commentsList.className = "comments-list";
    state.comments.forEach(function (comment) {
      const commentItem = document.createElement("article");
      commentItem.className = "comment-item";
      const commentHeader = document.createElement("div");
      commentHeader.className = "comment-header";
      commentHeader.appendChild(createAuthorBadge(
        comment.userId,
        comment.authorName,
        comment.authorPhotoURL
      ));
      if (currentUser && !currentUserBanned && comment.userId === currentUser.uid) {
        const deleteCommentButton = document.createElement("button");
        deleteCommentButton.className = "delete-button";
        deleteCommentButton.type = "button";
        deleteCommentButton.textContent = "Xóa";
        deleteCommentButton.addEventListener("click", async function () {
          deleteCommentButton.disabled = true;
          try {
            await deleteDoc(doc(db, "posts", post.id, "comments", comment.id));
          } catch (error) {
            deleteCommentButton.disabled = false;
            showStatus("Không thể xóa bình luận: " + error.message, true);
          }
        });
        commentHeader.appendChild(deleteCommentButton);
      }
      commentItem.appendChild(commentHeader);
      const commentText = document.createElement("p");
      commentText.className = "comment-content";
      commentText.textContent = comment.content;
      commentItem.appendChild(commentText);
      commentsList.appendChild(commentItem);
    });
    commentsSection.appendChild(commentsList);

    const commentForm = document.createElement("form");
    commentForm.className = "comment-form";
    const commentAuthorInput = document.createElement("input");
    commentAuthorInput.className = "comment-name-input";
    commentAuthorInput.type = "text";
    commentAuthorInput.maxLength = 60;
    commentAuthorInput.required = true;
    commentAuthorInput.value = currentUser ? getCurrentDisplayName() : "";
    commentAuthorInput.placeholder = currentUser ? "Tên hiển thị" : "Đăng nhập để bình luận.";
    commentAuthorInput.setAttribute("aria-label", "Tên hiển thị bình luận");
    commentAuthorInput.disabled = !currentUser || !profileReady || currentUserBanned;
    const commentInput = document.createElement("textarea");
    commentInput.maxLength = 1000;
    commentInput.rows = 2;
    commentInput.required = true;
    commentInput.placeholder = currentUser ? "Viết bình luận..." : "Đăng nhập để bình luận.";
    commentInput.disabled = !currentUser || !profileReady || currentUserBanned;
    const commentButton = document.createElement("button");
    commentButton.className = "button button-outline";
    commentButton.type = "submit";
    commentButton.textContent = "Gửi bình luận";
    commentButton.disabled = !currentUser || !profileReady || currentUserBanned;
    commentForm.append(commentAuthorInput, commentInput, commentButton);
    const commentStatus = document.createElement("p");
    commentStatus.className = "form-status";
    commentStatus.setAttribute("role", "status");
    commentStatus.setAttribute("aria-live", "polite");
    commentForm.addEventListener("submit", function (event) {
      event.preventDefault();
      addComment(
        post,
        commentAuthorInput.value,
        commentInput.value,
        commentButton,
        commentStatus
      ).then(function (saved) {
        if (saved) {
          commentInput.value = "";
        }
      });
    });
    commentsSection.appendChild(commentForm);
    commentsSection.appendChild(commentStatus);
    if (!currentUser) {
      const signInHint = document.createElement("p");
      signInHint.className = "comment-sign-in";
      signInHint.textContent = "Đăng nhập bằng Google để thả tim hoặc bình luận.";
      commentsSection.appendChild(signInHint);
    }
    interactions.appendChild(commentsSection);
    card.appendChild(interactions);
    postsList.appendChild(card);
  });
}

function setProfilePageStatus(message, isError) {
  profilePageStatus.textContent = message;
  profilePageStatus.classList.toggle("is-error", Boolean(isError));
  profilePageStatus.classList.toggle("is-success", Boolean(message) && !isError);
}

function appendProfileItem(container, title, detail, action) {
  const item = document.createElement("article");
  item.className = "profile-list-item";
  const itemText = document.createElement("div");
  itemText.className = "profile-list-item-text";
  const heading = document.createElement("h4");
  heading.textContent = title;
  itemText.appendChild(heading);
  if (detail) {
    const description = document.createElement("p");
    description.textContent = detail;
    itemText.appendChild(description);
  }
  item.appendChild(itemText);
  if (action) {
    item.appendChild(action);
  }
  container.appendChild(item);
}

function appendProfileEmptyState(container, message) {
  const empty = document.createElement("p");
  empty.className = "profile-muted";
  empty.textContent = message;
  container.appendChild(empty);
}

function renderProfilePosts(userId, postCount, isOwner) {
  profilePostsList.replaceChildren();
  if (firebaseReady && !bannedUsersLoaded) {
    appendProfileEmptyState(profilePostsList, "Đang kiểm tra trạng thái tài khoản...");
    return;
  }
  const userPosts = posts
    .filter(function (post) {
      const authorProfile = profileCache.get(post.userId) || {};
      const authorIsBanned = post.userId
        && (bannedUserIds.has(post.userId) || authorProfile.isBanned === true);
      return post.userId === userId
        && !authorIsBanned
        && (!currentUser || post.hiddenBy.indexOf(currentUser.uid) === -1);
    })
    .sort(function (first, second) { return second.createdAt - first.createdAt; });
  const postLimit = isOwner && isAdminUser(auth.currentUser) ? "∞" : MAX_POSTS_PER_USER;
  profilePostsHeading.textContent = (isOwner ? "Bài viết của bạn (" : "Bài viết của thành viên (")
    + postCount + "/" + postLimit + ")";
  if (userPosts.length === 0) {
    appendProfileEmptyState(profilePostsList, "Chưa có bài viết nào.");
    return;
  }
  userPosts.forEach(function (post) {
    let deleteButton = null;
    if ((isOwner || isAdminUser(currentUser)) && !currentUserBanned) {
      deleteButton = document.createElement("button");
      deleteButton.className = "delete-button";
      deleteButton.type = "button";
      deleteButton.textContent = "Xóa";
      deleteButton.addEventListener("click", function () {
        deletePost(post, deleteButton);
      });
    }
    appendProfileItem(
      profilePostsList,
      post.title,
      (CATEGORIES[post.category] || "Bài viết") + " · " + formatDate(post.createdAt),
      deleteButton
    );
  });
}

async function getProfilePost(postId) {
  const cachedPost = posts.find(function (post) { return post.id === postId; });
  if (cachedPost) {
    return cachedPost;
  }
  const postSnapshot = await getDoc(doc(db, "posts", postId));
  if (!postSnapshot.exists()) {
    return null;
  }
  const data = postSnapshot.data({ serverTimestamps: "estimate" });
  return {
    id: postSnapshot.id,
    title: data.title || "Bài viết đã xóa",
    category: data.category,
    createdAt: data.createdAt && typeof data.createdAt.toMillis === "function"
      ? data.createdAt.toMillis()
      : Date.now()
  };
}

async function renderProfileLikes(userId, hideForOthers, isOwner, requestId) {
  profileLikesList.replaceChildren();
  profileLikesHidden.hidden = !(hideForOthers && !isOwner);
  if (hideForOthers && !isOwner) {
    return;
  }
  const snapshot = await getDocs(query(
    collectionGroup(db, "likes"),
    where("userId", "==", userId)
  ));
  if (requestId !== profileRequestId) {
    return;
  }
  const likedPostIds = Array.from(new Set(snapshot.docs.map(function (like) {
    return like.ref.parent.parent && like.ref.parent.parent.id;
  }).filter(Boolean)));
  const likedPosts = await Promise.all(likedPostIds.map(getProfilePost));
  if (requestId !== profileRequestId) {
    return;
  }
  const visibleLikedPosts = likedPosts.filter(Boolean)
    .sort(function (first, second) { return second.createdAt - first.createdAt; });
  if (visibleLikedPosts.length === 0) {
    appendProfileEmptyState(profileLikesList, "Chưa có bài viết nào được thả tim.");
    return;
  }
  visibleLikedPosts.forEach(function (post) {
    appendProfileItem(
      profileLikesList,
      post.title,
      CATEGORIES[post.category] || "Bài viết"
    );
  });
}

async function renderProfileComments(userId, requestId) {
  profileCommentsList.replaceChildren();
  const snapshot = await getDocs(query(
    collectionGroup(db, "comments"),
    where("userId", "==", userId)
  ));
  if (requestId !== profileRequestId) {
    return;
  }
  const comments = snapshot.docs.map(function (comment) {
    const data = comment.data();
    const parentPost = comment.ref.parent.parent;
    return {
      content: data.content || "",
      postId: parentPost && parentPost.id,
      createdAt: data.createdAt && typeof data.createdAt.toMillis === "function"
        ? data.createdAt.toMillis()
        : 0
    };
  }).sort(function (first, second) {
    return second.createdAt - first.createdAt;
  });
  if (comments.length === 0) {
    appendProfileEmptyState(profileCommentsList, "Chưa có bình luận nào.");
    return;
  }
  for (const comment of comments) {
    const post = comment.postId ? await getProfilePost(comment.postId) : null;
    if (requestId !== profileRequestId) {
      return;
    }
    appendProfileItem(
      profileCommentsList,
      comment.content,
      (post ? "Trong bài: " + post.title : "Bình luận") + (
        comment.createdAt ? " · " + formatDate(comment.createdAt) : ""
      )
    );
  }
}

async function openProfile(userId) {
  if (!userId) {
    return;
  }
  const requestId = ++profileRequestId;
  activeProfileId = userId;
  activeProfileIsOwner = Boolean(currentUser && currentUser.uid === userId);
  profilePageTitle.textContent = activeProfileIsOwner ? "Trang cá nhân của bạn" : "Trang cá nhân";
  profilePage.hidden = false;
  composerSection.hidden = true;
  postsSection.hidden = true;
  updateAuthControls();
  profilePageContent.hidden = true;
  privateProfileMessage.hidden = true;
  privacySettingsForm.hidden = true;
  profilePageEmail.hidden = true;
  profilePostsList.replaceChildren();
  profileLikesList.replaceChildren();
  profileCommentsList.replaceChildren();
  profileLikesHidden.hidden = true;
  privacySettingsStatus.textContent = "";
  setProfilePageStatus("Đang tải trang cá nhân...", false);
  profilePage.scrollIntoView({ behavior: "smooth", block: "start" });

  try {
    const profileSnapshot = await getDoc(doc(db, "users", userId));
    if (requestId !== profileRequestId) {
      return;
    }
    if (!profileSnapshot.exists()) {
      setProfilePageStatus("Không tìm thấy trang cá nhân này.", true);
      return;
    }
    const profile = profileSnapshot.data();
    const privacySettings = profile.privacySettings || {
      profileVisibility: "public",
      hideLikedPosts: false
    };
    if (!activeProfileIsOwner && privacySettings.profileVisibility === "private") {
      setProfilePageStatus("", false);
      privateProfileMessage.hidden = false;
      return;
    }

    profileCache.set(userId, profile);
    profilePageContent.hidden = false;
    const viewingAdmin = activeProfileIsOwner && isAdminUser(currentUser);
    profilePageName.textContent = viewingAdmin ? "Admin" : profile.displayName || "Thành viên";
    profileAdminBadge.hidden = !viewingAdmin;
    const avatarURL = viewingAdmin
      ? ADMIN_AVATAR_URL
      : profile.avatarURL || profile.photoURL || "";
    profilePageAvatar.hidden = !avatarURL;
    profilePageAvatar.classList.toggle("admin-avatar", viewingAdmin);
    if (avatarURL) {
      profilePageAvatar.src = avatarURL;
    } else {
      profilePageAvatar.removeAttribute("src");
    }
    profilePageEmail.hidden = !activeProfileIsOwner || !currentUser.email;
    profilePageEmail.textContent = activeProfileIsOwner && currentUser.email
      ? currentUser.email
      : "";

    privacySettingsForm.hidden = !activeProfileIsOwner;
    profileVisibilityInput.value = privacySettings.profileVisibility === "private"
      ? "private"
      : "public";
    hideLikedPostsInput.checked = privacySettings.hideLikedPosts === true;
    profileVisibilityInput.disabled = currentUserBanned && activeProfileIsOwner;
    hideLikedPostsInput.disabled = currentUserBanned && activeProfileIsOwner;
    savePrivacySettingsButton.disabled = currentUserBanned && activeProfileIsOwner;

    renderProfilePosts(userId, Number.isInteger(profile.postCount) ? profile.postCount : 0, activeProfileIsOwner);
    setProfilePageStatus("", false);
    try {
      await renderProfileLikes(
        userId,
        privacySettings.hideLikedPosts === true,
        activeProfileIsOwner,
        requestId
      );
    } catch (error) {
      if (requestId === profileRequestId) {
        setProfilePageStatus("Không thể tải danh sách bài đã thả tim: " + error.message, true);
      }
    }
    if (requestId !== profileRequestId) {
      return;
    }
    try {
      await renderProfileComments(userId, requestId);
    } catch (error) {
      if (requestId === profileRequestId) {
        setProfilePageStatus("Không thể tải lịch sử bình luận: " + error.message, true);
      }
    }
  } catch (error) {
    if (requestId !== profileRequestId) {
      return;
    }
    if (!activeProfileIsOwner && error.code === "permission-denied") {
      setProfilePageStatus("", false);
      privateProfileMessage.hidden = false;
    } else {
      setProfilePageStatus("Không thể tải trang cá nhân: " + error.message, true);
    }
  }
}

function closeProfile() {
  profileRequestId += 1;
  activeProfileId = null;
  activeProfileIsOwner = false;
  profilePage.hidden = true;
  composerSection.hidden = false;
  postsSection.hidden = false;
  updateAuthControls();
  document.getElementById("posts-title").scrollIntoView({ behavior: "smooth", block: "start" });
}

openOwnProfileButton.addEventListener("click", function () {
  if (currentUser) {
    openProfile(currentUser.uid);
  }
});

closeProfilePageButton.addEventListener("click", closeProfile);

privacySettingsForm.addEventListener("submit", async function (event) {
  event.preventDefault();
  if (!currentUser || currentUserBanned || activeProfileId !== currentUser.uid) {
    return;
  }
  savePrivacySettingsButton.disabled = true;
  privacySettingsStatus.textContent = "Đang lưu cài đặt...";
  privacySettingsStatus.classList.remove("is-error", "is-success");
  const privacySettings = {
    profileVisibility: profileVisibilityInput.value === "private" ? "private" : "public",
    hideLikedPosts: hideLikedPostsInput.checked
  };
  try {
    await setDoc(doc(db, "users", currentUser.uid), {
      privacySettings: privacySettings,
      updatedAt: serverTimestamp()
    }, { merge: true });
    const currentProfile = profileCache.get(currentUser.uid) || {};
    profileCache.set(currentUser.uid, Object.assign({}, currentProfile, {
      privacySettings: privacySettings
    }));
    privacySettingsStatus.textContent = "Đã lưu cài đặt riêng tư.";
    privacySettingsStatus.classList.add("is-success");
    if (privacySettings.hideLikedPosts) {
      await renderProfileLikes(currentUser.uid, true, true);
    }
  } catch (error) {
    privacySettingsStatus.textContent = "Không thể lưu cài đặt: " + error.message;
    privacySettingsStatus.classList.add("is-error");
  } finally {
    savePrivacySettingsButton.disabled = currentUserBanned;
  }
});

// Tải một tệp lên Storage và trả về URL cùng đường dẫn để lưu trong Firestore.
function uploadAttachment(userId, postId, attachment, index, fixedPath) {
  if (!attachment.type || !/^(image|video|audio)\//.test(attachment.type)) {
    return Promise.reject(new Error("Không xác định được định dạng tệp: " + attachment.name));
  }
  const maxSize = MAX_FILE_SIZES[attachment.kind];
  if (!maxSize || attachment.blob.size > maxSize) {
    if (attachment.kind === "audio") {
      return Promise.reject(new Error(AUDIO_TOO_LARGE_MESSAGE));
    }
    const maxMegabytes = maxSize ? maxSize / (1024 * 1024) : 0;
    return Promise.reject(new Error(
      "Tệp \"" + attachment.name + "\" vượt quá giới hạn " + maxMegabytes + " MB."
    ));
  }

  const safeName = attachment.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 100) || "tep-dinh-kem";
  const storagePath = fixedPath || (
    "posts/" + userId + "/" + postId + "/" + index + "-" + safeName
  );
  const fileRef = ref(storage, storagePath);
  const uploadTask = uploadBytesResumable(fileRef, attachment.blob, {
    contentType: attachment.type
  });

  return new Promise(function (resolve, reject) {
    uploadTask.on(
      "state_changed",
      function (snapshot) {
        const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
        showStatus("Đang tải lên " + attachment.name + " (" + progress + "%)...", false);
      },
      reject,
      async function () {
        try {
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          resolve({
            name: attachment.name,
            type: attachment.type,
            kind: attachment.kind,
            url: url,
            storagePath: storagePath
          });
        } catch (error) {
          reject(error);
        }
      }
    );
  });
}

async function removeUploadedFiles(attachments) {
  let failedCount = 0;
  await Promise.all(attachments.map(async function (attachment) {
    try {
      await deleteObject(ref(storage, attachment.storagePath));
    } catch (error) {
      failedCount += 1;
      console.error("Không thể dọn tệp tải lên chưa được lưu:", error);
    }
  }));
  return failedCount;
}

async function ensureUserProfile(user) {
  const profileRef = doc(db, "users", user.uid);
  const existing = await getDoc(profileRef);
  if (existing.exists()) {
    const storedProfile = existing.data();
    if (storedProfile.isBanned === true) {
      return;
    }
    const profileData = {
      photoURL: storedProfile.photoURL || user.photoURL || "",
      avatarURL: storedProfile.avatarURL || "",
      avatarPath: storedProfile.avatarPath || "",
      postCount: Number.isInteger(storedProfile.postCount) ? storedProfile.postCount : 0,
      violationCount: Number.isInteger(storedProfile.violationCount)
        ? storedProfile.violationCount
        : 0,
      isBanned: false,
      lastUsernameUpdate: storedProfile.lastUsernameUpdate || null,
      privacySettings: {
        profileVisibility: storedProfile.privacySettings
          && storedProfile.privacySettings.profileVisibility === "private"
          ? "private"
          : "public",
        hideLikedPosts: Boolean(storedProfile.privacySettings
          && storedProfile.privacySettings.hideLikedPosts)
      },
      updatedAt: serverTimestamp()
    };
    if (!storedProfile.displayName) {
      profileData.displayName = (user.displayName || user.email || "Thành viên").slice(0, 60);
    }
    await setDoc(profileRef, profileData, { merge: true });
    return;
  }

  const existingPosts = await getDocs(query(
    collection(db, "posts"),
    where("userId", "==", user.uid)
  ));
  await setDoc(profileRef, {
    displayName: (user.displayName || user.email || "Thành viên").slice(0, 60),
    photoURL: user.photoURL || "",
    avatarURL: "",
    avatarPath: "",
    postCount: Math.min(existingPosts.size, MAX_POSTS_PER_USER),
    violationCount: 0,
    isBanned: false,
    lastUsernameUpdate: null,
    privacySettings: {
      profileVisibility: "public",
      hideLikedPosts: false
    },
    updatedAt: serverTimestamp()
  });
}

function watchCurrentProfile(user) {
  if (currentProfileUnsubscribe) {
    currentProfileUnsubscribe();
    currentProfileUnsubscribe = null;
  }
  return new Promise(function (resolve, reject) {
    let receivedInitialSnapshot = false;
    currentProfileUnsubscribe = onSnapshot(doc(db, "users", user.uid), function (snapshot) {
      const profile = snapshot.exists() ? snapshot.data() : {};
      currentPostCount = Number.isInteger(profile.postCount) ? profile.postCount : 0;
      currentViolationCount = Number.isInteger(profile.violationCount) ? profile.violationCount : 0;
      currentUserBanned = profile.isBanned === true;
      profileCache.set(user.uid, profile);
      if (document.activeElement !== displayNameInput) {
        displayNameInput.value = profile.displayName || user.displayName || "";
      }
      profileReady = snapshot.exists();
      updateAuthControls();
      renderPosts();
      if (!receivedInitialSnapshot) {
        receivedInitialSnapshot = true;
        if (snapshot.exists()) {
          resolve();
        } else {
          reject(new Error("Không tìm thấy hồ sơ tài khoản."));
        }
      }
    }, function (error) {
      showStatus("Không thể tải hồ sơ của bạn: " + error.message, true);
      console.error("Profile listener failed:", error);
      if (!receivedInitialSnapshot) {
        receivedInitialSnapshot = true;
        reject(error);
      }
    });
  });
}

async function registerContentViolation() {
  const profileRef = doc(db, "users", currentUser.uid);
  const banRef = doc(db, "bannedUsers", currentUser.uid);
  return runTransaction(db, async function (transaction) {
    const snapshot = await transaction.get(profileRef);
    if (!snapshot.exists()) {
      throw new Error("Không tìm thấy hồ sơ tài khoản.");
    }
    const profile = snapshot.data();
    const currentCount = Number.isInteger(profile.violationCount) ? profile.violationCount : 0;
    if (profile.isBanned === true || currentCount >= MAX_VIOLATIONS) {
      return { count: currentCount, isBanned: true };
    }
    const nextCount = currentCount + 1;
    transaction.update(profileRef, {
      violationCount: nextCount,
      isBanned: nextCount >= MAX_VIOLATIONS,
      updatedAt: serverTimestamp()
    });
    if (nextCount >= MAX_VIOLATIONS) {
      transaction.set(banRef, {
        uid: currentUser.uid,
        bannedAt: serverTimestamp()
      });
    }
    return { count: nextCount, isBanned: nextCount >= MAX_VIOLATIONS };
  });
}

async function rejectInappropriateContent(statusTarget) {
  try {
    const result = await registerContentViolation();
    currentViolationCount = result.count;
    currentUserBanned = result.isBanned;
    updateAuthControls();
    renderPosts();
    const message = "Nội dung chứa từ ngữ không phù hợp! Bạn đã vi phạm lần "
      + result.count + "/" + MAX_VIOLATIONS + "."
      + (result.isBanned ? " Tài khoản đã bị khóa vĩnh viễn." : "");
    showStatus(message, true);
    if (statusTarget) {
      statusTarget.textContent = message;
      statusTarget.classList.add("is-error");
      statusTarget.classList.remove("is-success");
    }
  } catch (error) {
    const message = "Không thể ghi nhận vi phạm: " + error.message;
    showStatus(message, true);
    if (statusTarget) {
      statusTarget.textContent = message;
      statusTarget.classList.add("is-error");
      statusTarget.classList.remove("is-success");
    }
  }
  return false;
}

async function createPostWithLimit(postRef, postData, user, isAdmin) {
  const profileRef = doc(db, "users", user.uid);
  await runTransaction(db, async function (transaction) {
    const profileSnapshot = await transaction.get(profileRef);
    if (!profileSnapshot.exists()) {
      throw new Error("Hồ sơ chưa sẵn sàng. Vui lòng tải lại trang rồi thử lại.");
    }
    if (profileSnapshot.data().isBanned === true) {
      throw new Error("Tài khoản của bạn đã bị khóa vĩnh viễn.");
    }
    const postCount = Number.isInteger(profileSnapshot.data().postCount)
      ? profileSnapshot.data().postCount
      : 0;
    if (!isAdmin && postCount >= MAX_POSTS_PER_USER) {
      throw new Error("Bạn đã đạt giới hạn 15 bài viết.");
    }
    transaction.update(profileRef, {
      postCount: postCount + 1,
      updatedAt: serverTimestamp()
    });
    transaction.set(postRef, postData);
  });
}

avatarInput.addEventListener("change", async function () {
  const file = avatarInput.files && avatarInput.files[0];
  if (!file) {
    return;
  }
  if (!currentUser || currentUserBanned) {
    avatarStatus.textContent = currentUserBanned
      ? "Tài khoản của bạn đã bị khóa vĩnh viễn."
      : "Hãy đăng nhập bằng Google để đổi ảnh đại diện.";
    avatarStatus.classList.add("is-error");
    return;
  }
  if (!file.type.startsWith("image/")) {
    avatarStatus.textContent = "Vui lòng chọn một tệp hình ảnh.";
    avatarStatus.classList.add("is-error");
    avatarInput.value = "";
    return;
  }
  if (file.size >= MAX_AVATAR_SIZE) {
    avatarStatus.textContent = "Ảnh đại diện phải nhỏ hơn 2 MB.";
    avatarStatus.classList.add("is-error");
    avatarInput.value = "";
    return;
  }

  avatarInput.disabled = true;
  avatarStatus.classList.remove("is-error", "is-success");
  avatarStatus.textContent = "Đang tải ảnh đại diện...";
  try {
    const avatarPath = "avatars/" + currentUser.uid + "/avatar";
    const avatarRef = ref(storage, avatarPath);
    await uploadBytesResumable(avatarRef, file, { contentType: file.type });
    const avatarURL = await getDownloadURL(avatarRef);
    await setDoc(doc(db, "users", currentUser.uid), {
      displayName: getCurrentDisplayName(),
      photoURL: currentUser.photoURL || "",
      avatarURL: avatarURL,
      avatarPath: avatarPath,
      updatedAt: serverTimestamp()
    }, { merge: true });
    avatarStatus.textContent = "Đã cập nhật ảnh đại diện.";
    avatarStatus.classList.add("is-success");
  } catch (error) {
    avatarStatus.textContent = "Không thể tải ảnh đại diện: " + error.message;
    avatarStatus.classList.add("is-error");
  } finally {
    avatarInput.disabled = false;
    avatarInput.value = "";
  }
});

displayNameForm.addEventListener("submit", async function (event) {
  event.preventDefault();
  if (!currentUser || !profileReady || currentUserBanned) {
    return;
  }
  const user = currentUser;
  const displayName = displayNameInput.value.trim();
  if (!displayName) {
    usernameStatus.textContent = "Tên hiển thị không được để trống.";
    usernameStatus.classList.add("is-error");
    usernameStatus.classList.remove("is-success");
    return;
  }

  const profile = profileCache.get(currentUser.uid) || {};
  if (displayName === profile.displayName) {
    usernameStatus.textContent = "Tên hiển thị không thay đổi.";
    usernameStatus.classList.remove("is-error");
    usernameStatus.classList.add("is-success");
    return;
  }

  const lastUpdate = profile.lastUsernameUpdate;
  if (lastUpdate && typeof lastUpdate.toMillis === "function"
    && Date.now() - lastUpdate.toMillis() < USERNAME_CHANGE_INTERVAL_MS) {
    usernameStatus.textContent =
      "Bạn chỉ có thể đổi tên hiển thị 1 lần sau mỗi 7 ngày. Vui lòng thử lại sau.";
    usernameStatus.classList.add("is-error");
    usernameStatus.classList.remove("is-success");
    return;
  }

  isUpdatingDisplayName = true;
  saveDisplayNameButton.disabled = true;
  usernameStatus.textContent = "Đang cập nhật tên hiển thị...";
  usernameStatus.classList.remove("is-error", "is-success");
  try {
    await setDoc(doc(db, "users", user.uid), {
      displayName: displayName,
      lastUsernameUpdate: serverTimestamp(),
      updatedAt: serverTimestamp()
    }, { merge: true });
    usernameStatus.textContent = "Đã cập nhật tên hiển thị.";
    usernameStatus.classList.add("is-success");
  } catch (error) {
    if (error.code === "permission-denied") {
      let currentLastUpdate = (profileCache.get(user.uid) || {}).lastUsernameUpdate;
      try {
        const freshProfile = await getDoc(doc(db, "users", user.uid));
        if (freshProfile.exists()) {
          const freshData = freshProfile.data();
          profileCache.set(user.uid, freshData);
          currentLastUpdate = freshData.lastUsernameUpdate;
        }
      } catch (refreshError) {
        console.error("Could not refresh username cooldown:", refreshError);
      }
      if (currentLastUpdate && typeof currentLastUpdate.toMillis === "function"
        && Date.now() - currentLastUpdate.toMillis() < USERNAME_CHANGE_INTERVAL_MS) {
        usernameStatus.textContent =
          "Bạn chỉ có thể đổi tên hiển thị 1 lần sau mỗi 7 ngày. Vui lòng thử lại sau.";
      } else {
        usernameStatus.textContent = "Không thể đổi tên hiển thị: " + error.message;
      }
    } else {
      usernameStatus.textContent = "Không thể đổi tên hiển thị: " + error.message;
    }
    usernameStatus.classList.add("is-error");
  } finally {
    isUpdatingDisplayName = false;
    updateAuthControls();
  }
});

// Đăng nhập bằng cửa sổ Google và lấy UID làm chủ sở hữu bài viết.
if (loginBtn) {
  loginBtn.addEventListener("click", async function () {
    if (!firebaseReady || !auth) {
      authStatus.textContent = "Không thể kết nối Firebase. Vui lòng thử lại sau.";
      return;
    }
    loginBtn.disabled = true;
    authStatus.textContent = "Đang mở cửa sổ đăng nhập Google...";
    try {
      provider.setCustomParameters({
        prompt: "select_account"
      });
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      currentUser = user;
      console.log("Đăng nhập popup thành công:", user.email);
      updateAuthControls(user);
      showStatus(
        isAdminUser(user)
          ? "Đăng nhập Admin thành công."
          : "Đăng nhập thành công.",
        false,
        true
      );
      try {
        await saveAuthMetadata(user);
      } catch (metadataError) {
        console.error("Không thể lưu thông tin đăng nhập:", metadataError);
        showStatus("Đăng nhập thành công nhưng không thể lưu thông tin tài khoản: "
          + metadataError.message, true);
      }
    } catch (error) {
      console.error("Lỗi đăng nhập popup:", error);
      authStatus.textContent = "Không thể đăng nhập bằng Google: " + error.message;
      showStatus("Không thể đăng nhập: " + error.message, true);
    } finally {
      loginBtn.disabled = false;
    }
  });
} else {
  console.error("Không tìm thấy nút đăng nhập có id là login-btn trong HTML!");
}

signOutButton.addEventListener("click", async function () {
  signOutButton.disabled = true;
  try {
    await signOut(auth);
    showStatus("Đã đăng xuất.", false, true);
  } catch (error) {
    showStatus("Không thể đăng xuất: " + error.message, true);
  } finally {
    signOutButton.disabled = false;
  }
});

// Chuyển ảnh/tệp đã lưu trong localStorage của phiên bản trước sang Storage/Firestore.
function dataUrlToBlob(dataUrl, fallbackType) {
  const separator = dataUrl.indexOf(",");
  if (!dataUrl.startsWith("data:") || separator < 0) {
    throw new Error("Một tệp cũ trong localStorage không có định dạng Data URL hợp lệ.");
  }

  const metadata = dataUrl.slice(5, separator);
  const type = metadata.split(";")[0] || fallbackType;
  const payload = dataUrl.slice(separator + 1);
  if (metadata.includes(";base64")) {
    const binary = atob(payload);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return new Blob([bytes], { type: type });
  }
  return new Blob([decodeURIComponent(payload)], { type: type });
}

function getLegacyPosts() {
  let serialized;
  try {
    serialized = window.localStorage.getItem(LEGACY_STORAGE_KEY);
  } catch (error) {
    throw new Error("Không thể đọc bài viết cũ trong localStorage: " + error.message);
  }
  if (serialized === null) {
    return [];
  }

  let savedPosts;
  try {
    savedPosts = JSON.parse(serialized);
  } catch (error) {
    throw new Error("Dữ liệu bài viết cũ trong localStorage không hợp lệ.");
  }
  if (!Array.isArray(savedPosts)) {
    throw new Error("Danh sách bài viết cũ trong localStorage không đúng định dạng.");
  }
  return savedPosts;
}

async function migrateLegacyPosts(user) {
  const legacyPosts = getLegacyPosts();
  if (legacyPosts.length === 0) {
    return 0;
  }

  let migratedCount = 0;
  for (const oldPost of legacyPosts) {
    if (!oldPost || typeof oldPost.id !== "string"
      || typeof oldPost.title !== "string"
      || typeof oldPost.content !== "string"
      || !Object.prototype.hasOwnProperty.call(CATEGORIES, oldPost.category)
      || !Array.isArray(oldPost.attachments)) {
      throw new Error("Có bài viết cũ không đúng định dạng; dữ liệu localStorage vẫn được giữ nguyên.");
    }
    if (containsBlockedLanguage(oldPost.title) || containsBlockedLanguage(oldPost.content)) {
      throw new Error("Bài viết cũ \"" + oldPost.title + "\" chứa từ ngữ không phù hợp; dữ liệu localStorage vẫn được giữ nguyên.");
    }

    const safeId = oldPost.id.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80);
    const postId = "legacy_" + safeId;
    const postRef = doc(db, "posts", postId);
    const existingPost = await getDoc(postRef);
    if (existingPost.exists()) {
      migratedCount += 1;
      continue;
    }

    const uploaded = [];
    try {
      for (let index = 0; index < oldPost.attachments.length; index += 1) {
        const oldAttachment = oldPost.attachments[index];
        const blob = dataUrlToBlob(oldAttachment.dataUrl, oldAttachment.type);
        const attachment = {
          name: oldAttachment.name,
          type: blob.type || oldAttachment.type,
          kind: oldAttachment.kind,
          blob: blob
        };
        if (!MAX_FILE_SIZES[attachment.kind] || blob.size > MAX_FILE_SIZES[attachment.kind]) {
          throw new Error("Tệp \"" + attachment.name + "\" vượt quá giới hạn dung lượng.");
        }
        const safeName = attachment.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 100) || "tep-dinh-kem";
        const storagePath = "posts/" + user.uid + "/" + postId + "/" + index + "-" + safeName;
        uploaded.push(await uploadAttachment(user.uid, postId, attachment, index, storagePath));
      }

      const createdAt = Number.isFinite(oldPost.createdAt)
        ? Timestamp.fromMillis(oldPost.createdAt)
        : serverTimestamp();
      await createPostWithLimit(postRef, {
        title: oldPost.title,
        category: oldPost.category,
        content: oldPost.content,
        createdAt: createdAt,
        userId: user.uid,
        authorName: getCurrentDisplayName(),
        authorPhotoURL: user.photoURL || "",
        attachments: uploaded
      }, user, isAdminUser(user));
      migratedCount += 1;
    } catch (error) {
      const cleanupFailures = await removeUploadedFiles(uploaded);
      const cleanupNote = cleanupFailures
        ? " Một số tệp tải dở chưa dọn được khỏi Storage."
        : "";
      throw new Error("Chưa chuyển được bài viết cũ \"" + oldPost.title + "\": " + error.message + cleanupNote);
    }
  }

  try {
    window.localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch (error) {
    throw new Error("Đã chuyển bài viết lên Firebase nhưng không thể xóa bản localStorage cũ: " + error.message);
  }
  return migratedCount;
}

// Đăng bài: tải tệp lên Storage trước, sau đó lưu nội dung và URL trong Firestore.
form.addEventListener("submit", async function (event) {
  event.preventDefault();
  const user = auth ? auth.currentUser : null;
  console.log("=== CHECK USER HIỆN TẠI ===", user);
  if (!firebaseReady || !user) {
    alert("Vui lòng đăng nhập bằng Google trước khi đăng bài.");
    return;
  }
  const userEmail = auth.currentUser.email || "";
  console.log("=== EMAIL ĐĂNG NHẬP ===", userEmail);
  const is_admin = isAdminUser(user);
  let authorName = is_admin
    ? "Admin"
    : (user.displayName || getCurrentDisplayName() || "Người dùng");
  let existingPostCount = currentPostCount;
  if (is_admin) {
    console.log(">>> XÁC NHẬN: ĐÃ LÊN ADMIN THÀNH CÔNG! <<<");
  } else {
    try {
      const q = query(collection(db, "posts"), where("userId", "==", user.uid));
      const querySnapshot = await getDocs(q);
      existingPostCount = querySnapshot.size;
      if (querySnapshot.size >= MAX_POSTS_PER_USER) {
        alert("Bạn đã đạt giới hạn tối đa 15 bài viết!");
        return;
      }
    } catch (error) {
      showStatus("Không thể kiểm tra số bài viết của bạn: " + error.message, true);
      return;
    }
  }

  if (!profileReady) {
    showStatus("Hồ sơ tài khoản đang được tải. Vui lòng thử lại.", true);
    return;
  }
  if (currentUserBanned) {
    showStatus("Tài khoản của bạn đã bị khóa vĩnh viễn do vi phạm nội dung 5 lần.", true);
    return;
  }
  if (isMigrating) {
    showStatus("Đang chuyển bài viết cũ lên Firebase. Vui lòng đợi.", true);
    return;
  }
  if ((recorder && recorder.state === "recording") || isFinalizingRecording) {
    showStatus("Hãy dừng ghi âm và đợi bản ghi hoàn tất trước khi đăng.", true);
    return;
  }

  const selectedAttachments = collectAttachments();
  if (selectedAttachments.length > MAX_ATTACHMENTS_PER_POST) {
    showStatus("Mỗi bài viết có thể đính kèm tối đa " + MAX_ATTACHMENTS_PER_POST + " tệp.", true);
    return;
  }
  const title = titleInput.value.trim();
  const content = contentInput.value.trim();
  if (containsBlockedLanguage(title) || containsBlockedLanguage(content)) {
    await rejectInappropriateContent();
    return;
  }
  const oversizedAttachment = selectedAttachments.find(function (attachment) {
    if (attachment.kind === "image") {
      return attachment.blob.size >= MAX_INLINE_IMAGE_SIZE;
    }
    return !MAX_FILE_SIZES[attachment.kind]
      || attachment.blob.size > MAX_FILE_SIZES[attachment.kind];
  });
  if (oversizedAttachment) {
    if (oversizedAttachment.kind === "audio") {
      showAudioTooLarge();
      return;
    }
    const maxSize = oversizedAttachment.kind === "image"
      ? MAX_INLINE_IMAGE_SIZE
      : (MAX_FILE_SIZES[oversizedAttachment.kind] || 0);
    showStatus(
      "Tệp \"" + oversizedAttachment.name + "\" vượt quá giới hạn "
        + (maxSize / (1024 * 1024)) + " MB"
        + (oversizedAttachment.kind === "image" ? " (ảnh phải nhỏ hơn giới hạn)." : "."),
      true
    );
    return;
  }

  const countBeforeSubmit = existingPostCount;
  isSubmitting = true;
  updateAuthControls();
  showStatus("Đang lưu bài viết...", false);

  const postRef = doc(collection(db, "posts"));
  const uploaded = [];
  const postAttachments = [];
  let postDataImageUrl = "";
  try {
    for (let index = 0; index < selectedAttachments.length; index += 1) {
      const attachment = selectedAttachments[index];
      if (attachment.kind === "image") {
        showStatus("Đang chuyển ảnh " + attachment.name + " sang Base64...", false);
        const imageUrl = await readFileAsDataUrl(attachment.blob);
        if (!postDataImageUrl) {
          postDataImageUrl = imageUrl;
        } else {
          postAttachments.push({
            name: attachment.name,
            type: attachment.type,
            kind: attachment.kind,
            url: imageUrl
          });
        }
      } else {
        const uploadedAttachment = await uploadAttachment(
          user.uid,
          postRef.id,
          attachment,
          index
        );
        uploaded.push(uploadedAttachment);
        postAttachments.push(uploadedAttachment);
      }
    }

    const postData = {
      title: title,
      category: categoryInput.value,
      content: content,
      createdAt: serverTimestamp(),
      userId: user.uid,
      authorName: authorName,
      authorPhotoURL: user.photoURL || "",
      imageUrl: postDataImageUrl,
      attachments: postAttachments
    };
    const postSizeEstimate = Object.assign({}, postData, { createdAt: "" });
    if (new Blob([JSON.stringify(postSizeEstimate)]).size > MAX_FIRESTORE_POST_SIZE_BYTES) {
      throw new Error(
        "Ảnh và nội dung vượt quá dung lượng an toàn của Firestore. "
          + "Hãy giảm kích thước ảnh hoặc rút ngắn nội dung bài viết."
      );
    }

    await createPostWithLimit(postRef, postData, user, is_admin);

    currentCategory = null;
    updateCategoryNavigation();
    form.reset();
    pendingRecording = null;
    renderPreview();
    setRecordingStatus("Cho phép trình duyệt sử dụng micro khi được hỏi.", false);
    currentPostCount = Math.max(currentPostCount, countBeforeSubmit + 1);
    updateAuthControls();
    showStatus("Đã đăng bài lên Firebase.", false, true);
    alert("Đăng bài thành công.");
    window.location.reload();
  } catch (error) {
    const cleanupFailures = uploaded.length ? await removeUploadedFiles(uploaded) : 0;
    const cleanupNote = cleanupFailures
      ? " Một số tệp tải dở chưa dọn được khỏi Storage."
      : "";
    showStatus("Không thể đăng bài: " + error.message + cleanupNote, true);
  } finally {
    isSubmitting = false;
    updateAuthControls();
  }
});

async function deletePost(post, button) {
  button.disabled = true;
  try {
    await deleteDoc(doc(db, "posts", post.id));
    posts = posts.filter(function (item) { return item.id !== post.id; });
    renderPosts();
    if (activeProfileId) {
      const activeProfile = profileCache.get(activeProfileId) || {};
      renderProfilePosts(
        activeProfileId,
        Number.isInteger(activeProfile.postCount) ? activeProfile.postCount : 0,
        activeProfileIsOwner
      );
    }

    let cleanupFailures = 0;
    for (const attachment of post.attachments) {
      if (!attachment.storagePath) {
        continue;
      }
      try {
        await deleteObject(ref(storage, attachment.storagePath));
      } catch (error) {
        if (error.code !== "storage/object-not-found") {
          cleanupFailures += 1;
          console.error("Không thể xóa tệp đính kèm khỏi Firebase Storage:", error);
        }
      }
    }
    const message = cleanupFailures
      ? "Đã xóa bài viết, nhưng một số tệp đính kèm chưa xóa được."
      : "Đã xóa bài viết.";
    if (profilePage.hidden) {
      showStatus(message, cleanupFailures > 0, cleanupFailures === 0);
    } else {
      setProfilePageStatus(message, cleanupFailures > 0);
    }
  } catch (error) {
    button.disabled = false;
    const message = "Không thể xóa bài viết: " + error.message;
    if (profilePage.hidden) {
      showStatus(message, true);
    } else {
      setProfilePageStatus(message, true);
    }
  }
}

async function editPost(post, button) {
  const title = window.prompt("Tiêu đề bài viết:", post.title);
  if (title === null) {
    return;
  }
  const category = window.prompt(
    "Mã chuyên mục (news, heritage, language, customs, instruments, clothing, food, folk-knowledge, other-ethnicities, literature, faq):",
    post.category
  );
  if (category === null) {
    return;
  }
  const content = window.prompt("Nội dung bài viết:", post.content);
  if (content === null) {
    return;
  }

  const updatedTitle = title.trim();
  const updatedContent = content.trim();
  if (!updatedTitle || updatedTitle.length > 160 || !updatedContent
    || !Object.prototype.hasOwnProperty.call(CATEGORIES, category)) {
    showStatus("Tiêu đề, nội dung hoặc chuyên mục không hợp lệ.", true);
    return;
  }
  if (containsBlockedLanguage(updatedTitle) || containsBlockedLanguage(updatedContent)) {
    showStatus("Tiêu đề hoặc nội dung chứa từ ngữ không phù hợp.", true);
    return;
  }

  button.disabled = true;
  try {
    await updateDoc(doc(db, "posts", post.id), {
      title: updatedTitle,
      category: category,
      content: updatedContent
    });
    post.title = updatedTitle;
    post.category = category;
    post.content = updatedContent;
    renderPosts();
    showStatus("Đã cập nhật bài viết.", false, true);
  } catch (error) {
    showStatus("Không thể cập nhật bài viết: " + error.message, true);
  } finally {
    button.disabled = false;
  }
}

async function hidePost(post, button) {
  const user = auth.currentUser;
  if (!user) {
    showStatus("Hãy đăng nhập để ẩn bài viết.", true);
    return;
  }

  button.disabled = true;
  try {
    await updateDoc(doc(db, "posts", post.id), {
      hiddenBy: arrayUnion(user.uid)
    });
    post.hiddenBy = Array.from(new Set(post.hiddenBy.concat(user.uid)));
    renderPosts();
    if (activeProfileId) {
      const activeProfile = profileCache.get(activeProfileId) || {};
      renderProfilePosts(
        activeProfileId,
        Number.isInteger(activeProfile.postCount) ? activeProfile.postCount : 0,
        activeProfileIsOwner
      );
    }
    showStatus("Bài viết đã được ẩn khỏi danh sách của bạn.", false, true);
  } catch (error) {
    showStatus("Không thể ẩn bài viết: " + error.message, true);
  } finally {
    button.disabled = false;
  }
}

// Lọc bài viết khi chọn chuyên mục trên thanh điều hướng.
categoryLinks.forEach(function (link) {
  link.addEventListener("click", function () {
    currentCategory = link.dataset.category || null;
    updateCategoryNavigation();
    renderPosts();
  });
});

// Nhấn logo/tên trang để bỏ bộ lọc và xem tất cả bài viết.
homeLink.addEventListener("click", function () {
  currentCategory = null;
  updateCategoryNavigation();
  renderPosts();
});
updateCategoryNavigation();

[imageInput, videoInput].forEach(function (input) {
  input.addEventListener("change", renderPreview);
});

audioInput.addEventListener("change", function () {
  const containsOversizedAudio = Array.from(audioInput.files).some(function (file) {
    return file.size > MAX_FILE_SIZES.audio;
  });
  if (containsOversizedAudio) {
    audioInput.value = "";
    showAudioTooLarge();
    renderPreview();
    return;
  }
  clearAudioTooLargeStatus();
  renderPreview();
});

function stopTracks() {
  if (activeStream) {
    activeStream.getTracks().forEach(function (track) {
      track.stop();
    });
    activeStream = null;
  }
}

function stopRecording() {
  if (recorder && recorder.state !== "inactive") {
    recordButton.disabled = true;
    isFinalizingRecording = true;
    setRecordingStatus("Đang hoàn tất bản ghi...", false);
    recorder.stop();
  }
}

// Ghi âm vẫn được hỗ trợ; bản ghi được tải lên Storage cùng các tệp khác.
async function startRecording() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.MediaRecorder) {
    setRecordingStatus("Trình duyệt này chưa hỗ trợ ghi âm trực tiếp.", false);
    return;
  }

  pendingRecording = null;
  renderPreview();
  recordButton.disabled = true;
  showStatus("", false);
  try {
    activeStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mimeCandidates = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus"];
    let options;
    for (const mimeType of mimeCandidates) {
      if (MediaRecorder.isTypeSupported(mimeType)) {
        options = { mimeType: mimeType };
        break;
      }
    }

    recorder = options ? new MediaRecorder(activeStream, options) : new MediaRecorder(activeStream);
    const chunks = [];
    recorder.ondataavailable = function (event) {
      if (event.data && event.data.size > 0) {
        chunks.push(event.data);
      }
    };
    recorder.onerror = function () {
      stopTracks();
      isFinalizingRecording = false;
      recordButton.disabled = false;
      recordButton.textContent = "● Ghi âm trực tiếp";
      setRecordingStatus("Đã xảy ra lỗi trong khi ghi âm.", false);
    };
    recorder.onstop = function () {
      const type = recorder.mimeType || (chunks[0] && chunks[0].type) || "audio/webm";
      const blob = new Blob(chunks, { type: type });
      stopTracks();
      isFinalizingRecording = false;
      recordButton.disabled = false;
      recordButton.textContent = "● Ghi âm trực tiếp";

      if (blob.size === 0) {
        setRecordingStatus("Không có âm thanh trong bản ghi. Hãy thử ghi lại.", false);
        return;
      }
      if (blob.size > MAX_FILE_SIZES.audio) {
        showAudioTooLarge();
        renderPreview();
        return;
      }

      clearAudioTooLargeStatus();
      pendingRecording = {
        blob: blob,
        type: blob.type,
        name: "ban-ghi-am-" + new Date().toISOString().replace(/[:.]/g, "-") + ".webm"
      };
      setRecordingStatus("Đã ghi âm xong. Bạn có thể nghe lại trong phần xem trước.", false);
      renderPreview();
    };

    recorder.start();
    recordButton.textContent = "■ Dừng ghi âm";
    recordButton.disabled = false;
    setRecordingStatus("Đang ghi âm... Nhấn “Dừng ghi âm” khi hoàn tất.", true);
  } catch (error) {
    stopTracks();
    recordButton.disabled = false;
    recordButton.textContent = "● Ghi âm trực tiếp";
    setRecordingStatus("Không thể ghi âm: " + error.message, false);
  }
}

recordButton.addEventListener("click", function () {
  if (recorder && recorder.state === "recording") {
    stopRecording();
  } else if (!recorder || recorder.state === "inactive") {
    startRecording();
  }
});

window.addEventListener("beforeunload", function () {
  stopTracks();
  previewUrls.forEach(function (url) {
    URL.revokeObjectURL(url);
  });
});

// Theo dõi bài viết trên Firestore để mọi khách truy cập thấy dữ liệu mới.
function subscribeToPosts() {
  const postsQuery = query(collection(db, "posts"), orderBy("createdAt", "desc"));
  onSnapshot(
    postsQuery,
    function (snapshot) {
      posts = snapshot.docs.map(function (documentSnapshot) {
        const data = documentSnapshot.data({ serverTimestamps: "estimate" });
        const createdAt = data.createdAt && typeof data.createdAt.toMillis === "function"
          ? data.createdAt.toMillis()
          : Date.now();
        return {
          id: documentSnapshot.id,
          title: data.title,
          category: data.category,
          content: data.content,
          createdAt: createdAt,
          userId: typeof data.userId === "string" ? data.userId : data.authorUid,
          authorName: data.authorName,
          authorPhotoURL: data.authorPhotoURL || "",
          imageUrl: typeof data.imageUrl === "string" ? data.imageUrl : "",
          hiddenBy: Array.isArray(data.hiddenBy) ? data.hiddenBy : [],
          attachments: Array.isArray(data.attachments) ? data.attachments : []
        };
      });
      renderPosts();
      if (activeProfileId) {
        const activeProfile = profileCache.get(activeProfileId) || {};
        renderProfilePosts(
          activeProfileId,
          Number.isInteger(activeProfile.postCount) ? activeProfile.postCount : 0,
          activeProfileIsOwner
        );
      }
    },
    function (error) {
      console.error("Không thể đọc bài viết từ Firestore:", error);
      postsList.replaceChildren();
      const message = document.createElement("p");
      message.className = "empty-state";
      message.textContent = "Không thể tải bài viết từ Firebase: " + error.message;
      postsList.appendChild(message);
    }
  );
}

// Nhận diện trạng thái đăng nhập, cập nhật nút đăng bài và chuyển dữ liệu cũ nếu có.
if (firebaseReady) {
  updateAuthControls();
  subscribeToPosts();
  subscribeToBannedUsers();
  onAuthStateChanged(
    auth,
    async function (user) {
      currentUser = user;
      subscribeToAdminMembers(user);
      currentPostCount = 0;
      currentViolationCount = 0;
      currentUserBanned = false;
      profileReady = false;
      if (!user && currentProfileUnsubscribe) {
        currentProfileUnsubscribe();
        currentProfileUnsubscribe = null;
      }
      updateAuthControls(user);
      renderPosts();

      if (!user) {
        return;
      }

      isMigrating = true;
      updateAuthControls();
      try {
        await ensureUserProfile(user);
        await watchCurrentProfile(user);
        const migratedCount = await migrateLegacyPosts(user);
        if (migratedCount > 0) {
          showStatus("Đã chuyển " + migratedCount + " bài viết cũ lên Firebase.", false, true);
        }
      } catch (error) {
        showStatus("Không thể khởi tạo hồ sơ hoặc chuyển dữ liệu cũ: " + error.message, true);
      } finally {
        isMigrating = false;
        updateAuthControls();
      }
    },
    function (error) {
      authStatus.textContent = "Không thể kiểm tra trạng thái đăng nhập.";
      showStatus("Lỗi Firebase Authentication: " + error.message, true);
      console.error("Firebase Auth state error:", error);
    }
  );
} else {
  updateAuthControls();
}
