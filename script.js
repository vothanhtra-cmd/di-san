"use strict";

// Firebase JS SDK dạng ES Module, tải trực tiếp từ CDN của Firebase.
import { app, auth, db, initializeFirebase, provider } from "./firebase-config.js";
import { getAnalytics, isSupported } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-analytics.js";
import {
  arrayUnion,
  collection,
  collectionGroup,
  deleteField,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
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
  getRedirectResult,
  onAuthStateChanged,
  signInWithPopup,
  signOut
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

const LEGACY_STORAGE_KEY = "raglai-heritage-posts";
const CLOUDINARY_CLOUD_NAME = "moxdvldn";
const CLOUDINARY_UPLOAD_PRESET = "my_present";
const MAX_FILE_SIZES = {
  image: 5 * 1024 * 1024,
  audio: 10 * 1024 * 1024,
  video: 50 * 1024 * 1024
};
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
const CHALLENGE_TARGET_SCORE = 500;
const QUESTION_TIME_MS = 10000;
const REACTION_DURATION_MS = 2000;
const SKIP_REACTION_DURATION_MS = 2500;
const QUIZ_DATA = [
  {
    id: "q01",
    question: "Xã Bắc Khánh Vĩnh trực thuộc tỉnh nào của nước ta?",
    options: ["Lâm Đồng", "Khánh Hòa", "Ninh Thuận", "Phú Yên"],
    answer: 1
  },
  {
    id: "q02",
    question: "Theo số liệu thống kê hành chính mới nhất được cập nhật trong đề tài, xã Bắc Khánh Vĩnh có diện tích tự nhiên khoảng bao nhiêu?",
    options: ["100,5 km²", "120,0 km²", "144,2 km²", "165,8 km²"],
    answer: 2
  },
  {
    id: "q03",
    question: "Quy mô dân số của xã Bắc Khánh Vĩnh (tính đến năm 2025) là khoảng bao nhiêu người?",
    options: ["5.400 người", "7.200 người", "9.199 người", "12.500 người"],
    answer: 2
  },
  {
    id: "q04",
    question: "Mật độ dân số trung bình tại xã Bắc Khánh Vĩnh đạt mức bao nhiêu?",
    options: ["45 người/km²", "64 người/km²", "85 người/km²", "110 người/km²"],
    answer: 1
  },
  {
    id: "q05",
    question: "Xã Bắc Khánh Vĩnh được thành lập trên cơ sở sáp nhập những đơn vị hành chính cấp xã nào trước đây?",
    options: [
      "Xã Khánh Bình và Xã Khánh Đông",
      "Xã Khánh Nam và Xã Khánh Thượng",
      "Xã Khánh Hiệp và Xã Khánh Vĩnh",
      "Xã Khánh Phú và Xã Khánh Trung"
    ],
    answer: 0
  },
  {
    id: "q06",
    question: "Trụ sở làm việc chính thức của UBND xã Bắc Khánh Vĩnh được đặt tại đâu?",
    options: [
      "Trụ sở UBND xã Khánh Đông cũ",
      "Trụ sở UBND xã Khánh Bình cũ",
      "Trung tâm văn hóa huyện Khánh Vĩnh",
      "Nhà văn hóa thôn Suối Cau"
    ],
    answer: 1
  },
  {
    id: "q07",
    question: "Theo số liệu công bố, trên địa bàn xã có bao nhiêu dân tộc anh em cùng chung sống?",
    options: ["5 dân tộc", "7 dân tộc", "9 dân tộc", "12 dân tộc"],
    answer: 2
  },
  {
    id: "q08",
    question: "Đồng bào dân tộc nào đóng vai trò là cộng đồng bản địa cốt lõi, lâu đời tại địa bàn nghiên cứu?",
    options: ["Dân tộc Ê Đê", "Dân tộc Raglai", "Dân tộc Tày", "Dân tộc Mường"],
    answer: 1
  },
  {
    id: "q09",
    question: "Nhạc cụ truyền thống tiêu biểu nhất, gắn liền với sinh hoạt tín ngưỡng và lễ hội của người Raglai là gì?",
    options: ["Cồng chiêng / Mã la", "Đàn T’rưng", "Sáo sậu", "Đàn K’lông pút"],
    answer: 0
  },
  {
    id: "q10",
    question: "Loại đàn tre độc đáo nổi tiếng của đồng bào Raglai được ví như tiếng lòng của núi rừng là gì?",
    options: ["Đàn bầu", "Đàn Chapi", "Đàn nhị", "Đàn tam thập lục"],
    answer: 1
  },
  {
    id: "q11",
    question: "Lễ hội quan trọng nhất phản ánh tín ngưỡng nông nghiệp và lòng biết ơn thần linh của người Raglai là lễ gì?",
    options: ["Lễ hội cồng chiêng", "Lễ ăn đầu lúa mới", "Lễ bỏ mả", "Lễ cúng bến nước"],
    answer: 1
  },
  {
    id: "q12",
    question: "Trang phục truyền thống của phụ nữ Raglai thường có điểm nhấn đặc trưng nào?",
    options: [
      "Thêu hoa văn cườm màu sắc rực rỡ trên nền vải chàm đen",
      "Váy lụa tơ tằm dài trắng",
      "Áo dài thêu hoa sen",
      "Váy thổ cẩm màu sáng rực rỡ"
    ],
    answer: 0
  },
  {
    id: "q13",
    question: "Ẩm thực truyền thống nổi tiếng của người Raglai nấu trong ống nứa tươi bao gồm món gì?",
    options: ["Cơm lam và thịt nướng ống tre", "Phở khô Gia Lai", "Bánh chưng gù", "Cháo cá suối"],
    answer: 0
  },
  {
    id: "q14",
    question: "Không gian sinh tồn chủ đạo của đồng bào Raglai ở Bắc Khánh Vĩnh gắn liền với địa hình nào?",
    options: [
      "Đồng bằng ven biển",
      "Vùng đồi núi cao và thung lũng dọc các triền suối",
      "Đảo và vùng ven biển",
      "Vùng đất cát ven đầm phá"
    ],
    answer: 1
  },
  {
    id: "q15",
    question: "Theo tín ngưỡng truyền thống, người Raglai thờ vị thần tối cao nào bảo hộ cho con người và mùa màng?",
    options: ["Thần Nước", "Thần Mặt Trời / Thần Xứ Sở (Yang)", "Thần Rừng Xanh", "Thần Lúa"],
    answer: 1
  },
  {
    id: "q16",
    question: "Trong hệ thống quản ốc bản làng truyền thống của người Raglai, người có uy tín lớn nhất lo việc cúng tế và giải quyết tranh chấp là ai?",
    options: ["Trưởng trạm y tế", "Già làng / Thầy cúng uy tín", "Bí thư chi bộ", "Chủ tịch xã"],
    answer: 1
  },
  {
    id: "q17",
    question: "Hình thức hát dân ca đối đáp trữ tình rất phổ biến trong sinh hoạt văn hóa tinh thần của người Raglai gọi là gì?",
    options: ["Hát ví giặm", "Hát Chặp / Hát đối đáp dân gian Raglai", "Hát quan họ", "Hát xoan"],
    answer: 1
  },
  {
    id: "q18",
    question: "Các địa điểm lịch sử - kinh tế tiêu biểu nằm tại khu vực Khánh Bình (Bắc Khánh Vĩnh) bao gồm địa danh nào sau đây?",
    options: [
      "Gạch tuynen Hiệp Khánh, Cây Xăng Trầm Hương, Phòng khám đa khoa khu vực Khánh Bình",
      "Chợ Bến Thành",
      "Phố cổ Hội An",
      "Cầu Rồng Đà Nẵng"
    ],
    answer: 0
  },
  {
    id: "q19",
    question: "Dự án trang web văn hóa mà bạn đang xây dựng và quản trị mang tên đầy đủ là gì?",
    options: [
      "Văn hóa các dân tộc Tây Nguyên",
      "VĂN HÓA RAGLAI BẮC KHÁNH VĨNH",
      "Du lịch sinh thái Khánh Vĩnh",
      "Di sản văn hóa Khánh Hòa"
    ],
    answer: 1
  },
  {
    id: "q20",
    question: "Mục tiêu cốt lõi nhất của việc xây dựng chuyên trang “Văn hóa Raglai Bắc Khánh Vĩnh” là gì?",
    options: [
      "Kinh doanh thương mại điện tử",
      "Gìn giữ ký ức, bảo tồn bản sắc và lan tỏa giá trị di sản văn hóa truyền thống",
      "Đăng tin tức thời sự chính trị",
      "Giải trí trực tuyến tổng hợp"
    ],
    answer: 1
  }
];
const CORRECT_RESPONSE_LINES = [
  "Bạn tài thật! Bạn đúng là người có tài!",
  "Á chà chà, đỉnh của chóp! Bạn là nhứt!",
  "Quá xuất sắc! Cứ đà này là rinh quà liền tay nha!",
  "Trí tuệ thâm sâu! Xin bái phục bái phục!",
  "Quá dữ dội luôn! Không ai địch nổi bạn rồi!",
  "Đúng là hệ mặt trời! Quá đỉnh!",
  "ĐỈNH CỦA CHÓP! Bạn bắt bài lẹ quá!",
  "Á CHÀ CHÀ! QUÁ DỮ DỘI!",
  "QUÁ XUẤT SẮC! CÂU NÀY KHÔNG LÀM KHÓ ĐƯỢC BẠN!",
  "ĐỈNH CỦA CHÓP! XUẤT SẮC!",
  "HUYỀN THOẠI LÀ ĐÂY!",
  "ĐỈNH CỦA CHÓP! XUẤT SẮC NHƯ CỤ!",
  "Á CHÀ CHÀ! QUÁ DỮ DỘI RỒI NHA!",
  "HUYỀN THOẠI LÀ ĐÂY CHỨ ĐÂU!",
  "TRÍ TUỆ THÂM SÂU - BÁI PHỤC BÁI PHỤC!",
  "QUÁ ĐỈNH! HỆ MẶT TRỜI GỌI TÊN BẠN!",
  "SIÊU NHÂN VĂN HÓA LÀ ĐÂY!"
];
const INCORRECT_RESPONSE_LINES = [
  "Cố cứng tí nữa là đẻ được trứng rồi! Thôi không sao đâu, còn câu khác.",
  "Bạn xui thôi, hoặc là bạn cần củng cố lại kiến thức vùng mình rồi đó!",
  "Úi giời ơi, suýt thì đúng! Thử lại câu sau gỡ gạc nha.",
  "Câu này hơi lắt léo hả? Không sao, vấp keo này ta bày keo khác!",
  "Ối dồi ôi, gần đúng rồi nhưng mà... tiếc quá đi mất!",
  "Ê câu này khó thật đấy, không trách bạn đâu!",
  "ỐI DỒI ÔI, SUÝT ĐÚNG!",
  "CỐ CỨNG TÍ NỮA LÀ ĐẺ TRỨNG!",
  "TRẬT NHỊP RỒI! CÂU SAU GỠ GẠC NHA!",
  "ỐI DỒI ÔI! SUÝT THÌ ĐÚNG RỒI ÔI LÀ ÔI!",
  "VẤP KEO NÀY TA BÀY KEO KHÁC NHÉ!",
  "CỐ CỨNG TÍ NỮA LÀ ĐẺ ĐƯỢC TRỨNG RỒI!",
  "TIẾC QUÁ ĐI MẤT! THỬ LẠI CÂU SAU NHA!",
  "Ê CÂU NÀY HƠI GẮT NHỈ, THÔI GỠ GẠC NÀO!",
  "ỐI GIỜI ÔI, GẦN ĐÚNG RỒI NHƯNG MÀ... TRƯỢT VỎ CHUỐI!"
];

function createChallengeAnimatedMeme(emoji, caption, background, tilt) {
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 220">'
    + '<rect width="320" height="220" rx="18" fill="' + background + '"/>'
    + '<g><animateTransform attributeName="transform" type="translate" '
    + 'values="0 0;0 -9;0 0" dur=".55s" repeatCount="indefinite"/>'
    + '<g><animateTransform attributeName="transform" type="rotate" '
    + 'values="' + (-tilt) + ' 160 100;' + tilt + ' 160 100;' + (-tilt)
    + ' 160 100" dur=".7s" repeatCount="indefinite"/>'
    + '<text x="160" y="125" text-anchor="middle" font-size="104">'
    + emoji + '</text></g></g>'
    + '<text x="160" y="194" text-anchor="middle" fill="#55211e" '
    + 'font-family="Arial,sans-serif" font-size="18" font-weight="700">'
    + caption + '</text></svg>';
  return {
    src: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg),
    alt: caption
  };
}

const CHALLENGE_EXTRA_MEMES = {
  celebrationDuck: createChallengeAnimatedMeme("🐥", "VỊT VÀNG QUẨY ĐU", "#fff2bc", 12),
  celebrationRabbit: createChallengeAnimatedMeme("🐰", "THỎ BẢY MÀU ĂN MỪNG", "#fce4f2", 9),
  frustratedCat: createChallengeAnimatedMeme("😿", "MÈO ÔM MẶT BẤT LỰC", "#e7e9f8", 8),
  fallenDuck: createChallengeAnimatedMeme("🐥", "VỊT VÀNG NGÃ NGỬA", "#f8e3d8", 24),
  confusedFace: createChallengeAnimatedMeme("😵‍💫❓", "ỦA, ĐÁP ÁN NÀO TA?", "#e4f2fb", 7)
};

const CHALLENGE_REACTION_MEMES = {
  correct: [
    { src: "https://media.giphy.com/media/26gspipWnu59srmM0/giphy.gif", alt: "Mèo vỗ tay phấn khích" },
    { src: "https://media.giphy.com/media/xT5LMFZDsj0AKUDYTS/giphy.gif", alt: "Pháo hoa bùng nổ ăn mừng" },
    { src: "https://media.giphy.com/media/3o7TKSjRrfIPjeiOkM/giphy.gif", alt: "Cún con nhảy múa vui vẻ" },
    { src: "https://media.giphy.com/media/artj92V8o75VPL7AeQ/giphy.gif", alt: "Gấu trúc lắc lư ăn mừng" },
    { src: "https://media.giphy.com/media/d2W7eZX5z62ziqdi/giphy.gif", alt: "Nhóm bạn cười và ôm nhau ăn mừng" },
    { src: "https://media.giphy.com/media/3oriNScTbEzEVoR1Is/giphy.gif", alt: "Người nhện nhảy múa mừng chiến thắng" },
    CHALLENGE_EXTRA_MEMES.celebrationDuck,
    CHALLENGE_EXTRA_MEMES.celebrationRabbit
  ],
  incorrect: [
    { src: "https://media.giphy.com/media/8L0Pky6C83SzkzU55a/giphy.gif", alt: "Biểu cảm ngơ ngác cười trừ" },
    { src: "https://media.giphy.com/media/10rHZ6OMsglHxS/giphy.gif", alt: "Trượt vỏ chuối hài hước" },
    { src: "https://media.giphy.com/media/9M5jK4GXmD5o1irGrF/giphy.gif", alt: "Gãi đầu suy nghĩ" },
    { src: "https://media.giphy.com/media/3oEjI6SIIHBdRxXI40/giphy.gif", alt: "Biểu cảm ngớ ngẩn buồn cười" },
    { src: "https://media.giphy.com/media/26ufcVAp3AiJJsrIs/giphy.gif", alt: "Cô bé mếu máo hài hước" },
    CHALLENGE_EXTRA_MEMES.frustratedCat,
    CHALLENGE_EXTRA_MEMES.fallenDuck
  ],
  skip: [
    { src: "https://media.giphy.com/media/9M5jK4GXmD5o1irGrF/giphy.gif", alt: "Bó tay, gãi đầu không biết đáp án" },
    { src: "https://media.giphy.com/media/8L0Pky6C83SzkzU55a/giphy.gif", alt: "Ngơ ngác không biết trả lời" },
    CHALLENGE_EXTRA_MEMES.confusedFace
  ]
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
const postProgressPanel = document.getElementById("post-progress-panel");
const postProgressMessage = document.getElementById("post-progress-message");
const postProgressPercent = document.getElementById("post-progress-percent");
const postProgressTrack = document.getElementById("post-progress-track");
const postProgressFill = document.getElementById("post-progress-fill");
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
const startChallengeButton = document.getElementById("start-challenge");
const challengeDialog = document.getElementById("challenge-dialog");
const challengeScoreValue = document.getElementById("challenge-score-value");
const challengeScoreLabel = document.getElementById("challenge-score-label");
const challengeAdminTestNotice = document.getElementById("challenge-admin-test-notice");
const challengePlayArea = document.getElementById("challenge-play-area");
const challengeSummary = document.getElementById("challenge-summary");
const challengeSummaryTitle = document.getElementById("challenge-summary-title");
const challengeSummaryResult = document.getElementById("challenge-summary-result");
const challengeSummaryScore = document.getElementById("challenge-summary-score");
const challengeSummaryStatus = document.getElementById("challenge-summary-status");
const challengeSummaryHomeButton = document.getElementById("challenge-summary-home");
const challengeHistoryButton = document.getElementById("challenge-history-button");
const challengeHistoryPanel = document.getElementById("challenge-history-panel");
const challengeHistoryStatus = document.getElementById("challenge-history-status");
const challengeHistoryList = document.getElementById("challenge-history-list");
const challengeProgressInfo = document.getElementById("challenge-progress-info");
const challengeTimer = document.querySelector(".challenge-timer");
const challengeTimerBar = document.getElementById("challenge-timer-bar");
const challengeQuestion = document.getElementById("challenge-question");
const challengeOptions = document.getElementById("challenge-options");
const challengeSkipButton = document.getElementById("challenge-skip");
const challengeFeedback = document.getElementById("challenge-feedback");
const challengeIntegrityWarning = document.getElementById("challenge-integrity-warning");
const challengeReaction = document.getElementById("challenge-reaction");
const challengeReactionImage = document.getElementById("challenge-reaction-image");
const challengeReactionError = document.getElementById("challenge-reaction-error");
const challengeReactionCaption = document.getElementById("challenge-reaction-caption");
const challengeRoundScore = document.getElementById("challenge-round-score");
const closeChallengeButton = document.getElementById("close-challenge");
const profileChallengeScore = document.getElementById("profile-challenge-score");
const profileChallengeScoreValue = document.getElementById("profile-challenge-score-value");

const adminManagementButton = document.createElement("button");
adminManagementButton.className = "button button-primary admin-management-button";
adminManagementButton.type = "button";
adminManagementButton.textContent = "📊 Quản lý thành viên & Thống kê điểm số";
adminManagementButton.hidden = true;
adminManagementButton.setAttribute("aria-haspopup", "dialog");
adminManagementButton.setAttribute("aria-controls", "admin-management-dialog");
authControls.appendChild(adminManagementButton);

const adminMemberPanel = document.createElement("dialog");
adminMemberPanel.id = "admin-management-dialog";
adminMemberPanel.className = "admin-member-dialog";
adminMemberPanel.setAttribute("aria-labelledby", "admin-member-title");
const adminMemberTitle = document.createElement("h2");
adminMemberTitle.id = "admin-member-title";
adminMemberTitle.textContent = "Quản lý thành viên & Thống kê điểm số";
const adminPanelHeader = document.createElement("div");
adminPanelHeader.className = "admin-dialog-header";
const adminPanelCloseButton = document.createElement("button");
adminPanelCloseButton.className = "button button-outline admin-dialog-close";
adminPanelCloseButton.type = "button";
adminPanelCloseButton.setAttribute("aria-label", "Đóng bảng quản trị");
adminPanelCloseButton.textContent = "×";
const adminMemberDescription = document.createElement("p");
adminMemberDescription.textContent =
  "Khóa tài khoản sẽ chặn đăng bài và ẩn bài viết; mở khóa sẽ khôi phục quyền đăng và hiển thị.";
const adminMemberStatus = document.createElement("p");
adminMemberStatus.className = "form-status";
adminMemberStatus.setAttribute("role", "status");
const adminMemberList = document.createElement("div");
adminMemberList.className = "admin-member-list";
const adminGiftStatus = document.createElement("p");
adminGiftStatus.className = "form-status";
adminGiftStatus.setAttribute("role", "status");
const adminGiftList = document.createElement("div");
adminGiftList.className = "admin-member-list";
const adminTabs = document.createElement("div");
adminTabs.className = "admin-tabs";
adminTabs.setAttribute("role", "tablist");
const adminMembersTab = document.createElement("button");
adminMembersTab.className = "button button-outline admin-tab is-active";
adminMembersTab.type = "button";
adminMembersTab.textContent = "Quản lý thành viên";
adminMembersTab.setAttribute("role", "tab");
const adminGiftsTab = document.createElement("button");
adminGiftsTab.className = "button button-outline admin-tab";
adminGiftsTab.type = "button";
adminGiftsTab.setAttribute("role", "tab");
adminGiftsTab.appendChild(document.createTextNode("Danh sách đạt 500 điểm nhận quà "));
const adminGiftBadge = document.createElement("span");
adminGiftBadge.className = "admin-gift-badge";
adminGiftBadge.hidden = true;
adminGiftsTab.appendChild(adminGiftBadge);
const adminMembersView = document.createElement("div");
adminMembersView.className = "admin-tab-panel";
adminMembersView.setAttribute("role", "tabpanel");
const adminGiftsView = document.createElement("div");
adminGiftsView.className = "admin-tab-panel";
adminGiftsView.setAttribute("role", "tabpanel");
adminGiftsView.hidden = true;
adminMemberPanel.append(
  adminPanelHeader,
  adminTabs,
  adminMembersView,
  adminGiftsView
);
adminPanelHeader.append(adminMemberTitle, adminPanelCloseButton);
adminTabs.append(adminMembersTab, adminGiftsTab);
adminMembersView.append(adminMemberDescription, adminMemberStatus, adminMemberList);
adminGiftsView.append(adminGiftStatus, adminGiftList);
document.body.appendChild(adminMemberPanel);

adminManagementButton.addEventListener("click", function () {
  if (!isAdminUser(auth && auth.currentUser)) {
    return;
  }
  showAdminTab("members");
  if (!adminMemberPanel.open) {
    adminMemberPanel.showModal();
  }
});

adminPanelCloseButton.addEventListener("click", function () {
  adminMemberPanel.close();
});

adminMemberPanel.addEventListener("click", function (event) {
  if (event.target === adminMemberPanel) {
    adminMemberPanel.close();
  }
});

function isAdminUser(user) {
  const email = user && typeof user.email === "string" ? user.email.trim().toLowerCase() : "";
  return ADMIN_EMAILS.some(function (adminEmail) {
    return adminEmail.trim().toLowerCase() === email;
  });
}

function isAdminMember(member) {
  if (!member) {
    return false;
  }
  const role = typeof member.role === "string" ? member.role.trim().toLowerCase() : "";
  const signedInUser = auth && auth.currentUser;
  return role === "admin"
    || isAdminUser({ email: member.email })
    || Boolean(signedInUser
      && isAdminUser(signedInUser)
      && member.uid === signedInUser.uid);
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
let postProgressHideTimeout = null;
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
let adminGiftsUnsubscribe = null;
let bannedUsersLoaded = false;
let adminMembers = [];
let giftNotifications = [];
let challengeScore = 0;
let challengeRoundScoreValue = 0;
let challengeQuestionIndex = 0;
let challengeViolationCount = 0;
let challengeCorrectCount = 0;
let challengeIncorrectCount = 0;
let challengeSkippedCount = 0;
let challengeTimedOutCount = 0;
let challengeActive = false;
let challengeQuestionLocked = false;
let challengeSaved = false;
let challengeCancelled = false;
let challengeCompleted = false;
let challengeAdminTestMode = false;
let challengeFocusLossRecorded = false;
let challengeWindowBlurred = false;
let challengeDocumentHidden = false;
let completedChallengeQuestionIds = new Set();
let roundCorrectQuestionIds = new Set();
let challengeDeadline = 0;
let challengeTimerInterval = null;
let challengeAdvanceTimeout = null;
let challengeAudioContext = null;
let challengeAudioMasterGain = null;
let challengeAudioCompressor = null;
let challengeReactionTimeout = null;
const challengeMemeQueues = { correct: [], incorrect: [], skip: [] };
let lastChallengeMemeSource = "";

function showStatus(message, isError, isSuccess) {
  formStatus.textContent = message;
  formStatus.classList.toggle("is-error", Boolean(isError));
  formStatus.classList.toggle("is-success", Boolean(isSuccess));
}

function logPostStep() {
}

function clearPostProgressHideTimeout() {
  if (postProgressHideTimeout !== null) {
    window.clearTimeout(postProgressHideTimeout);
    postProgressHideTimeout = null;
  }
}

function showPostProgress(message, percent) {
  clearPostProgressHideTimeout();
  showStatus("", false);
  postProgressPanel.hidden = false;
  postProgressPanel.classList.remove("is-error", "is-success");
  postProgressPanel.setAttribute("aria-busy", "true");
  postProgressMessage.textContent = message;
  postProgressTrack.hidden = false;
  postProgressPercent.hidden = false;
  const safePercent = Math.max(0, Math.min(100, Math.round(percent)));
  postProgressFill.style.width = safePercent + "%";
  postProgressPercent.textContent = safePercent + "%";
  postProgressTrack.setAttribute("aria-valuenow", String(safePercent));
}

function showPostError(message) {
  clearPostProgressHideTimeout();
  showStatus("", false);
  postProgressPanel.hidden = false;
  postProgressPanel.classList.remove("is-success");
  postProgressPanel.classList.add("is-error");
  postProgressPanel.setAttribute("aria-busy", "false");
  postProgressMessage.textContent = "Lỗi: " + message;
  postProgressTrack.hidden = true;
  postProgressPercent.hidden = true;
  postProgressFill.style.width = "0%";
  postProgressTrack.setAttribute("aria-valuenow", "0");
}

function showPostSuccess() {
  showPostProgress("Đăng bài thành công!", 100);
  postProgressPanel.classList.add("is-success");
  postProgressPanel.setAttribute("aria-busy", "false");
  postProgressHideTimeout = window.setTimeout(function () {
    postProgressPanel.hidden = true;
    postProgressHideTimeout = null;
  }, 3000);
}

function getPostErrorMessage(error) {
  const code = error && typeof error.code === "string" ? error.code : "";
  const message = error && typeof error.message === "string" ? error.message : "";
  if (code === "cloudinary/upload-failed" || /Cloudinary/i.test(message)) {
    if (/network|cors|timeout|hủy|abort|failed to fetch/i.test(message)) {
      return "Không thể kết nối với Cloudinary. Vui lòng kiểm tra mạng và thử lại.";
    }
    if (/preset|unsigned|format|file type|unsupported|invalid/i.test(message)) {
      return "Cloudinary từ chối tệp. Hãy kiểm tra định dạng tệp và cấu hình Upload Preset.";
    }
    return "Không thể tải tệp lên Cloudinary. " + message;
  }
  if (["unavailable", "deadline-exceeded", "network-request-failed"].includes(code)
    || /network|offline|failed to fetch/i.test(message)) {
    return "Không thể kết nối với máy chủ Firebase. Vui lòng kiểm tra mạng và thử lại.";
  }
  if (code === "permission-denied") {
    return "Firebase từ chối lưu bài viết. Vui lòng kiểm tra quyền truy cập.";
  }
  if (/vượt quá giới hạn/i.test(message)) {
    return message;
  }
  return message || "Không thể đăng bài. Vui lòng thử lại.";
}

function setAdminMemberStatus(message, isError) {
  adminMemberStatus.textContent = message;
  adminMemberStatus.classList.toggle("is-error", Boolean(isError));
  adminMemberStatus.classList.toggle("is-success", Boolean(message) && !isError);
}

function setAdminGiftStatus(message, isError) {
  adminGiftStatus.textContent = message;
  adminGiftStatus.classList.toggle("is-error", Boolean(isError));
  adminGiftStatus.classList.toggle("is-success", Boolean(message) && !isError);
}

function showAdminTab(tab) {
  const showGifts = tab === "gifts";
  adminMembersView.hidden = showGifts;
  adminGiftsView.hidden = !showGifts;
  adminMembersTab.classList.toggle("is-active", !showGifts);
  adminGiftsTab.classList.toggle("is-active", showGifts);
  adminMembersTab.setAttribute("aria-selected", String(!showGifts));
  adminGiftsTab.setAttribute("aria-selected", String(showGifts));
}

adminMembersTab.addEventListener("click", function () {
  showAdminTab("members");
});

adminGiftsTab.addEventListener("click", function () {
  showAdminTab("gifts");
});

function renderAdminGifts() {
  adminGiftList.replaceChildren();
  const memberNotifications = giftNotifications.filter(function (notification) {
    const email = typeof notification.userEmail === "string"
      ? notification.userEmail.trim().toLowerCase()
      : "";
    const isAdminEmail = ADMIN_EMAILS.some(function (adminEmail) {
      return adminEmail.trim().toLowerCase() === email;
    });
    const isCurrentAdmin = isAdminUser(auth && auth.currentUser)
      && notification.uid === auth.currentUser.uid;
    return !isAdminEmail && !isCurrentAdmin;
  });
  const pendingCount = memberNotifications.filter(function (notification) {
    return notification.status === "pending";
  }).length;
  adminGiftBadge.textContent = String(pendingCount);
  adminGiftBadge.hidden = pendingCount === 0;
  if (!isAdminUser(auth && auth.currentUser)) {
    return;
  }
  if (memberNotifications.length === 0) {
    const empty = document.createElement("p");
    empty.className = "profile-muted";
    empty.textContent = "Chưa có thành viên đạt mốc nhận quà.";
    adminGiftList.appendChild(empty);
    return;
  }

  memberNotifications.forEach(function (notification) {
    const row = document.createElement("article");
    row.className = "profile-list-item admin-member-row";
    const details = document.createElement("div");
    details.className = "profile-list-item-text";
    const name = document.createElement("h3");
    name.textContent = notification.userName || "Thành viên";
    const description = document.createElement("p");
    const reachedAt = notification.reachedAt
      && typeof notification.reachedAt.toDate === "function"
      ? notification.reachedAt.toDate().toLocaleString("vi-VN")
      : "Thời gian đang cập nhật";
    description.textContent = (notification.userEmail || "Không có email")
      + " · " + notification.score + " điểm · " + reachedAt
      + " · " + (notification.status === "completed" ? "Đã trao quà" : "Đang chờ trao");
    details.append(name, description);
    row.appendChild(details);
    if (notification.status === "pending") {
      const completeButton = document.createElement("button");
      completeButton.className = "button button-admin-unlock";
      completeButton.type = "button";
      completeButton.textContent = "Đã trao quà";
      completeButton.addEventListener("click", function () {
        markGiftAsCompleted(notification.id, completeButton);
      });
      row.appendChild(completeButton);
    }
    adminGiftList.appendChild(row);
  });
}

async function markGiftAsCompleted(notificationId, button) {
  if (!isAdminUser(auth && auth.currentUser)) {
    return;
  }
  button.disabled = true;
  try {
    await updateDoc(doc(db, "gift_notifications", notificationId), {
      status: "completed"
    });
  } catch (error) {
    setAdminGiftStatus("Không thể cập nhật trạng thái quà: " + error.message, true);
    button.disabled = false;
  }
}

function renderAdminMembers(members) {
  adminMemberList.replaceChildren();
  if (!isAdminUser(auth && auth.currentUser)) {
    return;
  }
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
    const isProtectedAdmin = isAdminMember(member);
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
    button.disabled = isProtectedAdmin && !member.isBanned;
    if (button.disabled) {
      button.title = "Không thể khóa tài khoản Admin Chủ Web.";
    }
    button.addEventListener("click", function () {
      if (!isAdminUser(auth && auth.currentUser)) {
        return;
      }
      const nextBannedState = !member.isBanned;
      if (nextBannedState && isAdminMember(member)) {
        window.alert("Không thể khóa tài khoản Admin Chủ Web!");
        return;
      }
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
        email: typeof profile.email === "string" ? profile.email : "",
        role: typeof profile.role === "string" ? profile.role : "",
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

function subscribeToAdminGifts(user) {
  if (adminGiftsUnsubscribe) {
    adminGiftsUnsubscribe();
    adminGiftsUnsubscribe = null;
  }
  if (!isAdminUser(user)) {
    giftNotifications = [];
    adminGiftList.replaceChildren();
    adminGiftBadge.hidden = true;
    return;
  }
  adminGiftsUnsubscribe = onSnapshot(collection(db, "gift_notifications"), function (snapshot) {
    giftNotifications = snapshot.docs.map(function (documentSnapshot) {
      return Object.assign({ id: documentSnapshot.id }, documentSnapshot.data());
    }).sort(function (first, second) {
      const firstTime = first.reachedAt && typeof first.reachedAt.toMillis === "function"
        ? first.reachedAt.toMillis()
        : 0;
      const secondTime = second.reachedAt && typeof second.reachedAt.toMillis === "function"
        ? second.reachedAt.toMillis()
        : 0;
      return secondTime - firstTime;
    });
    renderAdminGifts();
    setAdminGiftStatus("Đã tải " + giftNotifications.length + " yêu cầu nhận quà.", false);
  }, function (error) {
    console.error("Không thể tải yêu cầu nhận quà:", error);
    setAdminGiftStatus("Không thể tải danh sách nhận quà: " + error.message, true);
  });
}

async function setMemberBanned(userId, shouldBeBanned, button) {
  const adminUser = auth && auth.currentUser;
  if (!isAdminUser(adminUser)
    || !userId) {
    return;
  }
  if (shouldBeBanned && userId === adminUser.uid) {
    window.alert("Không thể khóa tài khoản Admin Chủ Web!");
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
      if (shouldBeBanned && isAdminMember({
        uid: userId,
        email: profile.email,
        role: profile.role
      })) {
        throw new Error("Không thể khóa tài khoản Admin Chủ Web!");
      }
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
    if (error.message === "Không thể khóa tài khoản Admin Chủ Web!") {
      window.alert(error.message);
    }
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
  adminManagementButton.hidden = !signedIn || !isAdmin;
  if ((!signedIn || !isAdmin) && adminMemberPanel.open) {
    adminMemberPanel.close();
  }
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

function challengeScoreRef(userId) {
  return doc(db, "users", userId, "private", "challenge");
}

function updateChallengeFocusState() {
  const focusLost = challengeWindowBlurred || challengeDocumentHidden;
  if (!focusLost) {
    challengeFocusLossRecorded = false;
    return;
  }
  if (!challengeActive || challengeFocusLossRecorded) {
    return;
  }
  challengeFocusLossRecorded = true;
  challengeViolationCount += 1;
  challengeIntegrityWarning.hidden = false;
  challengeIntegrityWarning.classList.remove("is-cancelled");
  challengeIntegrityWarning.textContent = "Cảnh báo! Phát hiện bạn rời khỏi màn hình làm bài (Lần "
    + challengeViolationCount + "/3). Vi phạm quá 3 lần sẽ bị hủy kết quả bài thi!";
  if (challengeViolationCount >= 3) {
    cancelChallengeForViolations();
  }
}

function getChallengeReactionMeme(type) {
  const memes = CHALLENGE_REACTION_MEMES[type];
  const queue = challengeMemeQueues[type];
  if (queue.length === 0) {
    for (let index = 0; index < memes.length; index += 1) {
      queue.push(index);
    }
    for (let index = queue.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      const currentIndex = queue[index];
      queue[index] = queue[swapIndex];
      queue[swapIndex] = currentIndex;
    }
    const nextIndex = queue[queue.length - 1];
    if (queue.length > 1 && memes[nextIndex].src === lastChallengeMemeSource) {
      const alternateIndex = queue.findIndex(function (memeIndex) {
        return memes[memeIndex].src !== lastChallengeMemeSource;
      });
      if (alternateIndex >= 0) {
        const currentIndex = queue[queue.length - 1];
        queue[queue.length - 1] = queue[alternateIndex];
        queue[alternateIndex] = currentIndex;
      }
    }
  }
  const nextMeme = memes[queue.pop()];
  lastChallengeMemeSource = nextMeme.src;
  return nextMeme;
}

function hideChallengeReaction() {
  if (challengeReactionTimeout !== null) {
    window.clearTimeout(challengeReactionTimeout);
    challengeReactionTimeout = null;
  }
  challengeReaction.hidden = true;
}

function showChallengeReaction(meme, response, reactionType, duration) {
  hideChallengeReaction();
  challengeReactionCaption.textContent = response;
  challengeReaction.classList.remove("is-correct", "is-incorrect", "is-skip");
  challengeReaction.classList.add("is-" + reactionType);
  challengeReactionError.hidden = true;
  challengeReactionImage.hidden = false;
  challengeReactionImage.alt = meme.alt;
  challengeReactionImage.dataset.memeSrc = meme.src;
  challengeReactionImage.onerror = function () {
    if (challengeReactionImage.dataset.memeSrc === meme.src) {
      challengeReactionImage.hidden = true;
      challengeReactionError.hidden = false;
      challengeReactionError.textContent = "Không tải được GIF; lời nhắn và âm thanh vẫn hoạt động.";
    }
  };
  challengeReactionImage.src = meme.src;
  challengeReaction.hidden = false;
  challengeReactionTimeout = window.setTimeout(hideChallengeReaction, duration);
}

function cancelChallengeForViolations() {
  challengeActive = false;
  challengeCancelled = true;
  challengeSaved = true;
  clearChallengeTimers();
  roundCorrectQuestionIds.clear();
  challengeRoundScoreValue = 0;
  challengeQuestionLocked = true;
  challengeQuestion.textContent = "Bài thi đã bị hủy";
  challengeProgressInfo.textContent = "Kết quả lượt thi này không được tính điểm.";
  challengeOptions.querySelectorAll("button").forEach(function (option) {
    option.disabled = true;
  });
  challengeSkipButton.disabled = true;
  challengeOptions.replaceChildren();
  challengeRoundScore.textContent = "Điểm lượt này: 0";
  challengeFeedback.textContent = "";
  challengeIntegrityWarning.hidden = false;
  challengeIntegrityWarning.classList.add("is-cancelled");
  challengeIntegrityWarning.textContent =
    "Bạn đã vi phạm quy chế chuyển tab quá 3 lần. Bài thi đã bị hủy và không được tính điểm!";
  challengeTimerBar.style.width = "0%";
  challengeTimer.setAttribute("aria-valuenow", "0");
  closeChallengeButton.disabled = false;
  closeChallengeButton.textContent = "Quay lại trang chủ";
}

document.addEventListener("visibilitychange", function () {
  challengeDocumentHidden = document.hidden;
  if (!challengeDocumentHidden && document.hasFocus()) {
    challengeWindowBlurred = false;
  }
  updateChallengeFocusState();
});

window.addEventListener("blur", function () {
  challengeWindowBlurred = true;
  updateChallengeFocusState();
});

window.addEventListener("focus", function () {
  challengeWindowBlurred = false;
  updateChallengeFocusState();
});

function clearChallengeTimers() {
  if (challengeTimerInterval !== null) {
    window.clearInterval(challengeTimerInterval);
    challengeTimerInterval = null;
  }
  if (challengeAdvanceTimeout !== null) {
    window.clearTimeout(challengeAdvanceTimeout);
    challengeAdvanceTimeout = null;
  }
  hideChallengeReaction();
}

function updateChallengeTimer() {
  const remaining = Math.max(0, challengeDeadline - Date.now());
  const fraction = remaining / QUESTION_TIME_MS;
  challengeTimerBar.style.width = (fraction * 100) + "%";
  challengeTimer.setAttribute("aria-valuenow", String(Math.ceil(remaining / 1000)));
  if (remaining === 0 && challengeActive && !challengeQuestionLocked) {
    chooseChallengeAnswer(-1);
  }
}

function startChallengeTimer() {
  clearChallengeTimers();
  challengeDeadline = Date.now() + QUESTION_TIME_MS;
  updateChallengeTimer();
  challengeTimerInterval = window.setInterval(updateChallengeTimer, 50);
}

function renderChallengeQuestion() {
  if (!challengeActive) {
    return;
  }
  if (challengeQuestionIndex >= QUIZ_DATA.length) {
    finishChallenge();
    return;
  }

  const item = QUIZ_DATA[challengeQuestionIndex];
  challengeQuestionLocked = false;
  challengeSkipButton.disabled = false;
  challengeProgressInfo.textContent =
    "Câu " + (challengeQuestionIndex + 1) + " / " + QUIZ_DATA.length;
  challengeQuestion.textContent = item.question;
  challengeFeedback.textContent = completedChallengeQuestionIds.has(item.id)
    ? "Bạn đã đạt điểm câu này từ trước. Hãy trả lời để ôn tập; câu này không cộng thêm điểm."
    : "";
  challengeOptions.replaceChildren();
  item.options.forEach(function (answer, index) {
    const option = document.createElement("button");
    option.className = "challenge-option";
    option.type = "button";
    option.textContent = String.fromCharCode(65 + index) + ". " + answer;
    option.addEventListener("click", function () {
      chooseChallengeAnswer(index);
    });
    challengeOptions.appendChild(option);
  });
  challengeRoundScore.textContent = "Điểm lượt này: " + challengeRoundScoreValue;
  startChallengeTimer();
}

function getChallengeAudioContext() {
  if (!window.AudioContext) {
    return null;
  }
  try {
    if (!challengeAudioContext) {
      challengeAudioContext = new window.AudioContext();
      challengeAudioMasterGain = challengeAudioContext.createGain();
      challengeAudioCompressor = challengeAudioContext.createDynamicsCompressor();
      challengeAudioCompressor.threshold.value = -8;
      challengeAudioCompressor.knee.value = 6;
      challengeAudioCompressor.ratio.value = 12;
      challengeAudioCompressor.attack.value = 0.003;
      challengeAudioCompressor.release.value = 0.18;
      challengeAudioMasterGain.gain.value = 1.4;
      challengeAudioMasterGain.connect(challengeAudioCompressor);
      challengeAudioCompressor.connect(challengeAudioContext.destination);
    }
    if (challengeAudioContext.state === "suspended") {
      challengeAudioContext.resume().catch(function (error) {
        console.warn("Không thể bật âm thanh thử thách:", error);
      });
    }
    return challengeAudioContext;
  } catch (error) {
    console.warn("Không thể khởi tạo Web Audio API:", error);
    return null;
  }
}

function playChallengeTone(context, frequency, startTime, duration, waveform, volume, endFrequency) {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = waveform;
  oscillator.frequency.setValueAtTime(frequency, startTime);
  if (endFrequency) {
    oscillator.frequency.exponentialRampToValueAtTime(endFrequency, startTime + duration);
  }
  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(volume, startTime + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
  oscillator.connect(gain);
  gain.connect(challengeAudioMasterGain);
  oscillator.start(startTime);
  oscillator.stop(startTime + duration + 0.01);
}

function playChallengeClap(context, startTime, frequency, volume) {
  const duration = 0.105;
  const frameCount = Math.floor(context.sampleRate * duration);
  const buffer = context.createBuffer(1, frameCount, context.sampleRate);
  const channel = buffer.getChannelData(0);
  for (let frame = 0; frame < frameCount; frame += 1) {
    channel[frame] = (Math.random() * 2 - 1) * (1 - frame / frameCount);
  }
  const source = context.createBufferSource();
  const filter = context.createBiquadFilter();
  const gain = context.createGain();
  source.buffer = buffer;
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(frequency, startTime);
  filter.Q.setValueAtTime(0.8, startTime);
  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(volume, startTime + 0.006);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
  source.connect(filter);
  filter.connect(gain);
  gain.connect(challengeAudioMasterGain);
  source.start(startTime);
  source.stop(startTime + duration);
}

function playChallengeSigh(context, startTime) {
  const duration = 0.88;
  const frameCount = Math.floor(context.sampleRate * duration);
  const buffer = context.createBuffer(1, frameCount, context.sampleRate);
  const channel = buffer.getChannelData(0);
  for (let frame = 0; frame < frameCount; frame += 1) {
    channel[frame] = (Math.random() * 2 - 1) * (1 - frame / frameCount * 0.25);
  }
  const source = context.createBufferSource();
  const filter = context.createBiquadFilter();
  const gain = context.createGain();
  source.buffer = buffer;
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(900, startTime);
  filter.frequency.linearRampToValueAtTime(520, startTime + duration);
  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.linearRampToValueAtTime(0.025, startTime + 0.22);
  gain.gain.linearRampToValueAtTime(0.03, startTime + 0.42);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
  source.connect(filter);
  filter.connect(gain);
  gain.connect(challengeAudioMasterGain);
  source.start(startTime);
  source.stop(startTime + duration);
  playChallengeTone(context, 260, startTime + 0.1, 0.72, "sine", 0.025, 145);
}

function playChallengeSound(correct, soundStyle) {
  const context = getChallengeAudioContext();
  if (!context) {
    return;
  }
  try {
    const now = context.currentTime + 0.015;
    if (correct) {
      for (let clap = 0; clap < 14; clap += 1) {
        const startTime = now + clap * 0.075 + Math.random() * 0.035;
        const frequency = 900 + Math.random() * 1900;
        const volume = 0.1 + Math.random() * 0.08;
        playChallengeClap(context, startTime, frequency, volume);
      }
      if (soundStyle === "cheer-fireworks") {
        [[523.25, 0], [659.25, 0.12], [783.99, 0.24], [1046.5, 0.39]].forEach(function (note) {
          playChallengeTone(context, note[0], now + note[1], 0.22, "triangle", 0.085);
        });
        playChallengeTone(context, 420, now + 0.08, 0.52, "sawtooth", 0.025, 790);
        playChallengeTone(context, 520, now + 0.18, 0.48, "triangle", 0.035, 980);
        for (let burst = 0; burst < 6; burst += 1) {
          const burstTime = now + 0.55 + burst * 0.11 + Math.random() * 0.04;
          playChallengeClap(context, burstTime, 2400 + Math.random() * 1000, 0.15);
          playChallengeTone(context, 1500 + burst * 130, burstTime, 0.16, "sine", 0.045, 900);
        }
      }
      if (soundStyle === "vuvuzela") {
        [[220, 0], [224, 0.03], [228, 0.06]].forEach(function (note) {
          playChallengeTone(context, note[0], now + note[1], 0.68, "sawtooth", 0.045, note[0] * 1.04);
        });
      }
      if (soundStyle === "reward-bell") {
        [[1046.5, 0], [1318.5, 0.16], [1568, 0.34]].forEach(function (note) {
          playChallengeTone(context, note[0], now + note[1], 0.42, "sine", 0.11);
          playChallengeTone(context, note[0] * 2, now + note[1], 0.24, "sine", 0.035);
        });
      }
      if (soundStyle === "victory-bell") {
        [[783.99, 0], [1046.5, 0.15], [1318.5, 0.3], [1568, 0.46]].forEach(function (note) {
          playChallengeTone(context, note[0], now + note[1], 0.62, "triangle", 0.085);
        });
      }
      return;
    }
    if (soundStyle === "sigh") {
      playChallengeSigh(context, now);
      return;
    }
    if (soundStyle === "bruh") {
      playChallengeTone(context, 180, now, 0.42, "triangle", 0.08, 76);
      playChallengeTone(context, 105, now + 0.18, 0.5, "sawtooth", 0.035, 62);
      return;
    }
    if (soundStyle === "toy-horn") {
      playChallengeTone(context, 420, now, 0.16, "square", 0.055, 680);
      playChallengeTone(context, 680, now + 0.17, 0.16, "square", 0.055, 460);
      playChallengeTone(context, 460, now + 0.34, 0.2, "square", 0.05, 310);
      return;
    }
    if (soundStyle === "sad-horn") {
      [[390, 0], [330, 0.2], [260, 0.4]].forEach(function (note) {
        playChallengeTone(context, note[0], now + note[1], 0.28, "triangle", 0.07, note[0] * 0.78);
      });
      return;
    }
    if (soundStyle === "crying") {
      playChallengeTone(context, 520, now, 0.55, "triangle", 0.06, 430);
      playChallengeTone(context, 640, now + 0.18, 0.4, "sine", 0.045, 500);
      playChallengeTone(context, 480, now + 0.55, 0.4, "triangle", 0.055, 390);
      return;
    }
    if (soundStyle === "curious") {
      playChallengeTone(context, 390, now, 0.38, "sine", 0.075, 195);
      playChallengeTone(context, 610, now + 0.25, 0.22, "triangle", 0.055, 430);
      playChallengeTone(context, 470, now + 0.48, 0.25, "sine", 0.05, 650);
      playChallengeTone(context, 740, now + 0.69, 0.23, "sine", 0.04, 570);
      return;
    }
    playChallengeTone(context, 640, now, 0.34, "triangle", 0.09, 245);
    playChallengeTone(context, 190, now + 0.26, 0.16, "sine", 0.055, 125);
  } catch (error) {
    console.warn("Không thể phát hiệu ứng âm thanh thử thách:", error);
  }
}

function getChallengeReactionSoundStyle(correct, skipped) {
  if (skipped) {
    return "curious";
  }
  const soundStyles = correct
    ? ["cheer-fireworks", "vuvuzela", "reward-bell", "victory-bell"]
    : ["bruh", "toy-horn", "sigh", "sad-horn", "crying"];
  return soundStyles[Math.floor(Math.random() * soundStyles.length)];
}

function getChallengeResponse(correct) {
  const responses = correct ? CORRECT_RESPONSE_LINES : INCORRECT_RESPONSE_LINES;
  return responses[Math.floor(Math.random() * responses.length)];
}

function chooseChallengeAnswer(selectedIndex) {
  if (!challengeActive || challengeQuestionLocked) {
    return;
  }
  challengeQuestionLocked = true;
  if (challengeTimerInterval !== null) {
    window.clearInterval(challengeTimerInterval);
    challengeTimerInterval = null;
  }
  const item = QUIZ_DATA[challengeQuestionIndex];
  const skipped = selectedIndex === -2;
  const timedOut = selectedIndex === -1;
  const correct = selectedIndex >= 0 && selectedIndex === item.answer;
  const correctAnswer = String.fromCharCode(65 + item.answer) + ". " + item.options[item.answer];
  const reactionDuration = skipped ? SKIP_REACTION_DURATION_MS : REACTION_DURATION_MS;
  if (selectedIndex >= 0) {
    const response = getChallengeResponse(correct);
    const meme = getChallengeReactionMeme(correct ? "correct" : "incorrect");
    showChallengeReaction(meme, response, correct ? "correct" : "incorrect", reactionDuration);
    playChallengeSound(correct, getChallengeReactionSoundStyle(correct, false));
  } else {
    const response = skipped
      ? "BIẾT NGAY MÀ! XEM ĐÁP ÁN ĐỂ MỞ MANG TẦM MẮT NÀO: Đáp án đúng là "
        + correctAnswer + "."
      : "Hết giờ mất rồi! Đáp án đúng là " + correctAnswer + ".";
    const meme = getChallengeReactionMeme("skip");
    showChallengeReaction(
      meme,
      response,
      "skip",
      skipped ? SKIP_REACTION_DURATION_MS : REACTION_DURATION_MS
    );
    playChallengeSound(false, getChallengeReactionSoundStyle(false, selectedIndex < 0));
  }
  const alreadyEarned = completedChallengeQuestionIds.has(item.id)
    || roundCorrectQuestionIds.has(item.id);
  if (correct) {
    challengeCorrectCount += 1;
  } else if (timedOut) {
    challengeTimedOutCount += 1;
  } else if (skipped) {
    challengeSkippedCount += 1;
  } else {
    challengeIncorrectCount += 1;
  }
  challengeOptions.querySelectorAll("button").forEach(function (option, index) {
    option.disabled = true;
    if (index === item.answer) {
      option.classList.add("is-correct");
    } else if (index === selectedIndex) {
      option.classList.add("is-incorrect");
    }
  });
  challengeSkipButton.disabled = true;
  if (correct && !alreadyEarned) {
    roundCorrectQuestionIds.add(item.id);
    challengeRoundScoreValue += 1;
    challengeRoundScore.textContent = "Điểm lượt này: " + challengeRoundScoreValue;
    if (challengeAdminTestMode) {
      challengeScoreValue.textContent = challengeRoundScoreValue + " điểm test";
    }
  }
  if (timedOut) {
    challengeFeedback.textContent = "Hết giờ! Đáp án đúng là " + correctAnswer + ".";
  } else if (skipped) {
    challengeFeedback.textContent = "Bạn đã bỏ qua. Đáp án đúng là " + correctAnswer + ".";
  } else if (!correct) {
    challengeFeedback.textContent = "Chưa chính xác. Đáp án đúng là " + correctAnswer + ".";
  } else if (alreadyEarned) {
    challengeFeedback.textContent =
      "Chính xác! Câu này đã được tính điểm trước đó nên không cộng thêm.";
  } else if (challengeAdminTestMode) {
    challengeFeedback.textContent = "Chính xác! Đáp án đúng trong lượt kiểm tra.";
  } else {
    challengeFeedback.textContent =
      "Chính xác! Câu này sẽ được cộng 1 điểm nếu chưa được ghi nhận trên tài khoản.";
  }
  challengeAdvanceTimeout = window.setTimeout(function () {
    challengeAdvanceTimeout = null;
    challengeQuestionIndex += 1;
    renderChallengeQuestion();
  }, reactionDuration);
}

async function saveChallengeRound() {
  if (challengeSaved) {
    return true;
  }
  challengeSaved = true;
  if (challengeAdminTestMode) {
    challengeScoreValue.textContent = challengeRoundScoreValue + " điểm test";
    challengeFeedback.classList.remove("is-error");
    challengeFeedback.textContent = "Kết quả lượt kiểm tra: " + challengeCorrectCount
      + " đúng, " + challengeIncorrectCount + " sai, " + challengeSkippedCount
      + " bỏ qua, " + challengeTimedOutCount + " câu hết giờ. Điểm test không được lưu.";
    startChallengeButton.disabled = false;
    closeChallengeButton.disabled = false;
    return true;
  }
  if (!currentUser || roundCorrectQuestionIds.size === 0) {
    return true;
  }
  const user = currentUser;
  const scoreRef = challengeScoreRef(user.uid);
  const notificationRef = doc(collection(db, "gift_notifications"));
  startChallengeButton.disabled = true;
  closeChallengeButton.disabled = true;
  challengeFeedback.textContent = "Đang lưu điểm của bạn...";
  try {
    const result = await runTransaction(db, async function (transaction) {
      const scoreSnapshot = await transaction.get(scoreRef);
      const previous = scoreSnapshot.exists() ? scoreSnapshot.data() : {};
      const previousScore = Number.isInteger(previous.score) ? previous.score : 0;
      const previousQuestionIds = Array.isArray(previous.correctQuestionIds)
        ? previous.correctQuestionIds.filter(function (questionId) {
          return typeof questionId === "string";
        })
        : [];
      const savedQuestionIds = new Set(previousQuestionIds);
      const newlyAwardedIds = Array.from(roundCorrectQuestionIds).filter(function (questionId) {
        return !savedQuestionIds.has(questionId);
      });
      newlyAwardedIds.forEach(function (questionId) {
        savedQuestionIds.add(questionId);
      });
      const totalScore = previousScore + newlyAwardedIds.length;
      const alreadyNotified = previous.giftNotified === true;
      const notifyGift = totalScore >= CHALLENGE_TARGET_SCORE && !alreadyNotified;
      transaction.set(scoreRef, {
        score: totalScore,
        correctQuestionIds: Array.from(savedQuestionIds),
        giftNotified: alreadyNotified || notifyGift,
        updatedAt: serverTimestamp()
      }, { merge: true });
      if (notifyGift) {
        transaction.set(notificationRef, {
          uid: user.uid,
          userName: getCurrentDisplayName(),
          userEmail: user.email || "",
          score: totalScore,
          reachedAt: serverTimestamp(),
          status: "pending"
        });
      }
      return {
        score: totalScore,
        newlyAwarded: newlyAwardedIds.length,
        notified: notifyGift
      };
    });
    challengeScore = result.score;
    result.newlyAwarded && roundCorrectQuestionIds.forEach(function (questionId) {
      completedChallengeQuestionIds.add(questionId);
    });
    challengeRoundScoreValue = result.newlyAwarded;
    challengeRoundScore.textContent = "Điểm lượt này: " + challengeRoundScoreValue;
    challengeScoreValue.textContent = challengeScore + " điểm";
    if (activeProfileIsOwner && activeProfileId === user.uid) {
      profileChallengeScoreValue.textContent = challengeScore + " điểm";
    }
    challengeFeedback.textContent = result.newlyAwarded > 0
      ? "Đã ghi nhận " + result.newlyAwarded + " câu mới. Tổng điểm của bạn: "
        + challengeScore + "."
      : "Các câu đúng trong lượt này đã được tính điểm trước đó. Tổng điểm: "
        + challengeScore + ".";
    if (result.notified) {
      window.alert("Chúc mừng! Bạn đã đạt " + challengeScore
        + " điểm và đủ điều kiện nhận quà tri ân. Quản trị viên sẽ sớm liên hệ với bạn.");
    }
    return true;
  } catch (error) {
    console.error("Không thể lưu điểm thử thách:", error);
    challengeFeedback.textContent = "Không thể lưu điểm: " + error.message;
    challengeFeedback.classList.add("is-error");
    challengeSaved = false;
    return false;
  } finally {
    startChallengeButton.disabled = false;
    closeChallengeButton.disabled = false;
  }
}

async function saveChallengeHistory() {
  const user = currentUser;
  if (challengeAdminTestMode) {
    return false;
  }
  if (!user) {
    throw new Error("Bạn cần đăng nhập để lưu lịch sử thử thách.");
  }
  const historyRef = doc(collection(
    db,
    "users",
    user.uid,
    "private",
    "challenge",
    "history"
  ));
  await setDoc(historyRef, {
    completedAt: serverTimestamp(),
    correctCount: challengeCorrectCount,
    totalQuestions: QUIZ_DATA.length,
    score: challengeRoundScoreValue
  });
  return true;
}

async function loadChallengeHistory() {
  const user = currentUser;
  if (!user) {
    challengeHistoryStatus.textContent = "Vui lòng đăng nhập để xem lịch sử làm bài.";
    return;
  }
  challengeHistoryStatus.classList.remove("is-error");
  challengeHistoryStatus.textContent = "Đang tải lịch sử...";
  challengeHistoryList.replaceChildren();
  try {
    const historyQuery = query(
      collection(db, "users", user.uid, "private", "challenge", "history"),
      orderBy("completedAt", "desc"),
      limit(10)
    );
    const historySnapshot = await getDocs(historyQuery);
    if (!currentUser || currentUser.uid !== user.uid) {
      return;
    }
    if (historySnapshot.empty) {
      challengeHistoryStatus.textContent = isAdminUser(user)
        ? "Chưa có lịch sử. Các lượt kiểm tra của Admin không được lưu."
        : "Bạn chưa có lượt thử thách hoàn thành nào.";
      return;
    }
    historySnapshot.docs.forEach(function (historyDocument) {
      const history = historyDocument.data();
      const row = document.createElement("li");
      const completedAt = history.completedAt
        && typeof history.completedAt.toDate === "function"
        ? history.completedAt.toDate().toLocaleString("vi-VN")
        : "Thời gian chưa xác định";
      const correctCount = Number.isInteger(history.correctCount) ? history.correctCount : 0;
      const totalQuestions = Number.isInteger(history.totalQuestions)
        ? history.totalQuestions
        : QUIZ_DATA.length;
      const score = Number.isInteger(history.score) ? history.score : 0;
      row.textContent = completedAt + " · Đúng " + correctCount + "/" + totalQuestions
        + " câu · Điểm đạt được: " + score;
      challengeHistoryList.appendChild(row);
    });
    challengeHistoryStatus.textContent = "Hiển thị " + historySnapshot.size + " lượt gần nhất.";
  } catch (error) {
    console.error("Không thể tải lịch sử thử thách:", error);
    challengeHistoryStatus.textContent = "Không thể tải lịch sử: " + error.message;
    challengeHistoryStatus.classList.add("is-error");
  }
}

async function finishChallenge() {
  if (!challengeActive) {
    return;
  }
  challengeActive = false;
  challengeCompleted = true;
  clearChallengeTimers();
  challengePlayArea.hidden = true;
  challengeSummary.hidden = false;
  const completedStrongly = challengeCorrectCount >= 10;
  challengeSummaryTitle.textContent = completedStrongly
    ? "Bạn đã xuất sắc hoàn thành!"
    : "Bạn đã hoàn thành thử thách!";
  challengeSummaryResult.textContent = "Bạn đã trả lời đúng " + challengeCorrectCount
    + "/" + QUIZ_DATA.length + " câu. "
    + (completedStrongly
      ? "Quá tuyệt vời!"
      : "Cần cố gắng ôn tập thêm kiến thức văn hóa vùng mình nhé!")
    + " · Sai " + challengeIncorrectCount + " · Bỏ qua " + challengeSkippedCount
    + " · Hết giờ " + challengeTimedOutCount + ".";
  challengeTimerBar.style.width = "0%";
  challengeTimer.setAttribute("aria-valuenow", "0");
  challengeFeedback.classList.remove("is-error");
  challengeSummaryScore.textContent = challengeAdminTestMode
    ? "Điểm lượt kiểm tra: " + challengeRoundScoreValue + "."
    : "Điểm mới đạt được: " + challengeRoundScoreValue + ".";
  challengeSummaryStatus.classList.remove("is-error");
  challengeSummaryStatus.textContent = challengeAdminTestMode
    ? "Lượt kiểm tra Admin không được lưu vào điểm số hoặc lịch sử."
    : "Đang lưu kết quả và lịch sử...";
  closeChallengeButton.textContent = "Quay lại trang chủ";
  closeChallengeButton.disabled = true;

  const scoreSaved = await saveChallengeRound();
  challengeSummaryScore.textContent = challengeAdminTestMode
    ? "Điểm lượt kiểm tra: " + challengeRoundScoreValue + "."
    : "Điểm mới đạt được: " + challengeRoundScoreValue + ".";
  if (challengeAdminTestMode) {
    closeChallengeButton.disabled = false;
    return;
  }
  if (!scoreSaved) {
    challengeSummaryStatus.textContent = challengeFeedback.textContent;
    challengeSummaryStatus.classList.add("is-error");
    closeChallengeButton.disabled = false;
    return;
  }
  try {
    const historySaved = await saveChallengeHistory();
    challengeSummaryStatus.textContent = historySaved
      ? "Kết quả và lịch sử lượt chơi đã được lưu riêng tư."
      : "Điểm đã được lưu; lượt kiểm tra Admin không được lưu lịch sử.";
  } catch (error) {
    console.error("Không thể lưu lịch sử thử thách:", error);
    challengeSummaryStatus.textContent = "Điểm đã được lưu, nhưng không thể lưu lịch sử: "
      + error.message;
    challengeSummaryStatus.classList.add("is-error");
  }
  startChallengeButton.disabled = false;
  closeChallengeButton.disabled = false;
}

async function closeChallenge() {
  if (challengeCompleted && !challengeSaved && challengeRoundScoreValue > 0) {
    closeChallengeButton.disabled = true;
    const saved = await saveChallengeRound();
    if (!saved) {
      challengeSummaryStatus.textContent = challengeFeedback.textContent;
      challengeSummaryStatus.classList.add("is-error");
      return;
    }
    challengeSummaryScore.textContent = "Điểm mới đạt được: " + challengeRoundScoreValue + ".";
    try {
      await saveChallengeHistory();
      challengeSummaryStatus.textContent = "Kết quả và lịch sử lượt chơi đã được lưu riêng tư.";
      challengeSummaryStatus.classList.remove("is-error");
    } catch (error) {
      console.error("Không thể lưu lịch sử thử thách:", error);
      challengeSummaryStatus.textContent = "Điểm đã được lưu, nhưng không thể lưu lịch sử: "
        + error.message;
      challengeSummaryStatus.classList.add("is-error");
    }
  }
  if (challengeCompleted) {
    if (challengeDialog.open) {
      challengeDialog.close();
    }
    startChallengeButton.disabled = false;
    window.location.hash = "home-link";
    document.getElementById("home-link").scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }
  if (challengeCancelled) {
    challengeDialog.close();
    startChallengeButton.disabled = false;
    window.location.hash = "home-link";
    document.getElementById("home-link").scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }
  challengeActive = false;
  clearChallengeTimers();
  if (!challengeSaved && challengeRoundScoreValue > 0) {
    const saved = await saveChallengeRound();
    if (!saved) {
      return;
    }
  }
  if (challengeDialog.open) {
    challengeDialog.close();
  }
  startChallengeButton.disabled = false;
}

async function startChallenge() {
  if (!currentUser) {
    window.alert("Vui lòng đăng nhập bằng Google để lưu điểm thử thách.");
    if (firebaseReady) {
      loginBtn.click();
    }
    return;
  }
  if (!firebaseReady || startChallengeButton.disabled) {
    return;
  }
  startChallengeButton.disabled = true;
  challengeRoundScoreValue = 0;
  challengeQuestionIndex = 0;
  challengeViolationCount = 0;
  challengeCorrectCount = 0;
  challengeIncorrectCount = 0;
  challengeSkippedCount = 0;
  challengeTimedOutCount = 0;
  challengeSaved = false;
  challengeActive = false;
  challengeCancelled = false;
  challengeCompleted = false;
  challengeAdminTestMode = isAdminUser(currentUser);
  roundCorrectQuestionIds = new Set();
  completedChallengeQuestionIds = new Set();
  challengeIntegrityWarning.hidden = true;
  challengeIntegrityWarning.classList.remove("is-cancelled");
  challengeIntegrityWarning.textContent = "";
  challengePlayArea.hidden = false;
  challengeSummary.hidden = true;
  challengeSummaryResult.textContent = "";
  challengeSummaryScore.textContent = "";
  challengeSummaryStatus.textContent = "";
  challengeSummaryStatus.classList.remove("is-error");
  challengeHistoryPanel.hidden = true;
  challengeHistoryButton.setAttribute("aria-expanded", "false");
  challengeHistoryStatus.textContent = "";
  challengeHistoryList.replaceChildren();
  challengeHistoryButton.disabled = false;
  closeChallengeButton.textContent = "Thoát thử thách";
  closeChallengeButton.disabled = false;
  challengeRoundScore.textContent = "Điểm lượt này: 0";
  challengeFeedback.classList.remove("is-error");
  challengeFeedback.textContent = "Đang tải điểm cá nhân...";
  challengeQuestion.textContent = "";
  challengeOptions.replaceChildren();
  challengeSkipButton.disabled = true;
  challengeProgressInfo.textContent = "";
  challengeScoreValue.textContent = "Đang tải...";
  challengeAdminTestNotice.hidden = !challengeAdminTestMode;
  challengeScoreLabel.textContent = challengeAdminTestMode ? "Điểm lượt test" : "Điểm của bạn";
  challengeTimerBar.style.width = "100%";
  if (!challengeDialog.open) {
    challengeDialog.showModal();
  }
  const uid = currentUser.uid;
  if (challengeAdminTestMode) {
    challengeScore = 0;
    completedChallengeQuestionIds = new Set();
    challengeScoreValue.textContent = "0 điểm test";
    challengeFeedback.textContent = "";
    challengeDocumentHidden = document.hidden;
    challengeWindowBlurred = !document.hasFocus();
    challengeFocusLossRecorded = challengeDocumentHidden || challengeWindowBlurred;
    challengeActive = true;
    renderChallengeQuestion();
    return;
  }
  try {
    const scoreSnapshot = await getDoc(challengeScoreRef(uid));
    if (!currentUser || currentUser.uid !== uid || !challengeDialog.open) {
      return;
    }
    const scoreData = scoreSnapshot.exists() ? scoreSnapshot.data() : {};
    challengeScore = Number.isInteger(scoreData.score) ? scoreData.score : 0;
    completedChallengeQuestionIds = new Set(
      Array.isArray(scoreData.correctQuestionIds)
        ? scoreData.correctQuestionIds.filter(function (questionId) {
          return typeof questionId === "string";
        })
        : []
    );
    challengeScoreValue.textContent = challengeScore + " điểm";
    challengeFeedback.textContent = "";
    challengeDocumentHidden = document.hidden;
    challengeWindowBlurred = !document.hasFocus();
    challengeFocusLossRecorded = challengeDocumentHidden || challengeWindowBlurred;
    challengeActive = true;
    renderChallengeQuestion();
  } catch (error) {
    console.error("Không thể tải điểm thử thách:", error);
    challengeFeedback.textContent = "Không thể tải điểm cá nhân: " + error.message;
    challengeFeedback.classList.add("is-error");
    startChallengeButton.disabled = false;
  }
}

startChallengeButton.addEventListener("click", startChallenge);
closeChallengeButton.addEventListener("click", closeChallenge);
challengeSummaryHomeButton.addEventListener("click", closeChallenge);
challengeSkipButton.addEventListener("click", function () {
  chooseChallengeAnswer(-2);
});
challengeHistoryButton.addEventListener("click", function () {
  const isOpening = challengeHistoryPanel.hidden;
  challengeHistoryPanel.hidden = !isOpening;
  challengeHistoryButton.setAttribute("aria-expanded", String(isOpening));
  if (isOpening) {
    loadChallengeHistory();
  }
});
challengeDialog.addEventListener("cancel", function (event) {
  event.preventDefault();
  closeChallenge();
});

// Khởi tạo Firebase App, Firestore, Authentication và Analytics.
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

    const postMedia = post.attachments.slice();
    if (post.imageUrl && !postMedia.some(function (attachment) {
      return attachment.url === post.imageUrl;
    })) {
      postMedia.unshift({ name: "Hình ảnh", kind: "image", url: post.imageUrl });
    }
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
  profileChallengeScore.hidden = true;
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
    const showPrivateMemberScore = activeProfileIsOwner && !isAdminUser(currentUser);
    profileChallengeScore.hidden = !showPrivateMemberScore;
    if (showPrivateMemberScore) {
      profileChallengeScoreValue.textContent = "Đang tải...";
      try {
        const scoreSnapshot = await getDoc(challengeScoreRef(userId));
        if (requestId !== profileRequestId) {
          return;
        }
        const scoreData = scoreSnapshot.exists() ? scoreSnapshot.data() : {};
        profileChallengeScoreValue.textContent =
          (Number.isInteger(scoreData.score) ? scoreData.score : 0) + " điểm";
      } catch (error) {
        if (requestId === profileRequestId) {
          profileChallengeScoreValue.textContent = "Không tải được điểm";
          setProfilePageStatus("Không thể tải điểm thử thách: " + error.message, true);
        }
      }
    }

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

function getTechnicalErrorDetails(error) {
  const code = error && typeof error.code === "string" ? error.code : "unknown";
  const message = error && typeof error.message === "string"
    ? error.message
    : "Lỗi không xác định.";
  return "error.code=" + code + "; error.message=" + message;
}

function uploadToCloudinary(file, fileName, kind, onProgress) {
  const resourceType = kind === "image" ? "image" : "video";
  const endpoint = "https://api.cloudinary.com/v1_1/" + CLOUDINARY_CLOUD_NAME
    + "/" + resourceType + "/upload";
  const formData = new FormData();
  formData.append("file", file, fileName);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

  return new Promise(function (resolve, reject) {
    const request = new XMLHttpRequest();
    request.open("POST", endpoint);
    request.timeout = 120000;
    request.upload.addEventListener("progress", function (event) {
      if (event.lengthComputable && typeof onProgress === "function") {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    });
    request.addEventListener("load", function () {
      let result;
      try {
        result = JSON.parse(request.responseText || "{}");
      } catch (error) {
        reject(new Error(
          "Cloudinary trả về phản hồi không hợp lệ (HTTP " + request.status + ")."
        ));
        return;
      }
      if (request.status < 200 || request.status >= 300) {
        const cloudinaryMessage = result && result.error && result.error.message
          ? result.error.message
          : request.statusText;
        reject(new Error("Cloudinary từ chối tải lên (HTTP " + request.status + "): "
          + cloudinaryMessage));
        return;
      }
      if (!result || typeof result.secure_url !== "string" || !result.secure_url) {
        reject(new Error("Phản hồi Cloudinary không có secure_url."));
        return;
      }
      resolve(result.secure_url);
    });
    request.addEventListener("error", function () {
      reject(new Error("Lỗi mạng hoặc CORS khi kết nối Cloudinary."));
    });
    request.addEventListener("timeout", function () {
      reject(new Error("Tải lên Cloudinary quá thời gian chờ 120 giây."));
    });
    request.addEventListener("abort", function () {
      reject(new Error("Yêu cầu tải lên Cloudinary đã bị hủy."));
    });
    request.send(formData);
  });
}

// Tải tệp lên Cloudinary; Firestore chỉ lưu secure_url và metadata.
async function uploadAttachment(attachment, onProgress) {
  const maxSize = MAX_FILE_SIZES[attachment.kind];
  if (!maxSize) {
    logPostStep("Kiểm tra tệp thất bại: loại tệp không được hỗ trợ (" + attachment.name + ").");
    throw new Error("Loại tệp không được hỗ trợ: " + attachment.name);
  }
  if (!attachment.type || !attachment.type.toLowerCase().startsWith(attachment.kind + "/")) {
    logPostStep(
      "Kiểm tra tệp thất bại: MIME không khớp loại " + attachment.kind
        + " (" + (attachment.type || "trống") + ")."
    );
    throw new Error(
      "Không nhận diện được định dạng " + attachment.kind + " của tệp \""
        + attachment.name + "\". Hãy chọn đúng loại tệp."
    );
  }
  if (attachment.blob.size === 0) {
    logPostStep("Kiểm tra tệp thất bại: tệp rỗng (" + attachment.name + ").");
    throw new Error("Tệp \"" + attachment.name + "\" không có dữ liệu.");
  }
  if (attachment.blob.size > maxSize) {
    logPostStep("Kiểm tra tệp thất bại: vượt giới hạn dung lượng (" + attachment.name + ").");
    if (attachment.kind === "audio") {
      throw new Error(AUDIO_TOO_LARGE_MESSAGE);
    }
    throw new Error(
      "Tệp \"" + attachment.name + "\" vượt quá giới hạn "
        + (maxSize / (1024 * 1024)) + " MB."
    );
  }
  logPostStep(
    "Kiểm tra tệp đạt: " + attachment.name + ", "
        + attachment.blob.size + " bytes, " + attachment.type + "."
  );
  try {
    logPostStep("Đang tải \"" + attachment.name + "\" trực tiếp lên Cloudinary.");
    const url = await uploadToCloudinary(attachment.blob, attachment.name, attachment.kind, onProgress);
    logPostStep("Cloudinary đã trả secure_url cho \"" + attachment.name + "\".");
    return {
      name: attachment.name,
      type: attachment.type,
      kind: attachment.kind,
      url: url
    };
  } catch (error) {
    const uploadError = new Error(
      "Không thể tải lên \"" + attachment.name + "\": " + error.message
    );
    uploadError.code = "cloudinary/upload-failed";
    logPostStep("Upload thất bại: " + getTechnicalErrorDetails(uploadError));
    throw uploadError;
  }
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
      avatarPath: deleteField(),
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
    const avatarURL = await uploadToCloudinary(
      file,
      file.name,
      "image",
      function (progress) {
        avatarStatus.textContent = "Đang tải ảnh đại diện (" + progress + "%)...";
      }
    );
    await setDoc(doc(db, "users", currentUser.uid), {
      displayName: getCurrentDisplayName(),
      photoURL: currentUser.photoURL || "",
      avatarURL: avatarURL,
      avatarPath: deleteField(),
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

// Chuyển ảnh/tệp đã lưu trong localStorage của phiên bản trước sang Cloudinary/Firestore.
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
        uploaded.push(await uploadAttachment(attachment));
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
      const cleanupNote = uploaded.length
        ? " Tệp đã tải lên Cloudinary không tự xóa được; hãy dọn thủ công trong Cloudinary Console nếu cần."
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

// Đăng bài: tải tệp lên Cloudinary trước, sau đó lưu URL và nội dung trong Firestore.
submitButton.addEventListener("click", function () {
  clearPostProgressHideTimeout();
  showPostProgress("Đang kiểm tra bài viết...", 0);
});
form.addEventListener("invalid", function (event) {
  const field = event.target;
  const validationMessages = {
    "post-title": "Vui lòng nhập tiêu đề.",
    "post-category": "Vui lòng chọn chuyên mục.",
    "post-content": "Vui lòng nhập nội dung bài viết."
  };
  const fieldId = field && field.id ? field.id : "";
  showPostError(validationMessages[fieldId] || "Vui lòng kiểm tra các trường bắt buộc.");
}, true);

form.addEventListener("submit", async function (event) {
  event.preventDefault();
  clearPostProgressHideTimeout();
  showPostProgress("Đang kiểm tra bài viết...", 0);
  logPostStep("Bắt đầu kiểm tra phiên đăng nhập và tệp đính kèm.");
  const user = auth ? auth.currentUser : null;
  if (!firebaseReady || !user) {
    logPostStep("Dừng: Firebase chưa sẵn sàng hoặc người dùng chưa đăng nhập.");
    showPostError(firebaseReady
      ? "Vui lòng đăng nhập bằng Google trước khi đăng bài."
      : "Không thể kết nối với máy chủ Firebase.");
    return;
  }
  logPostStep("Đã xác nhận người dùng đăng nhập và Firebase sẵn sàng.");
  const is_admin = isAdminUser(user);
  let authorName = is_admin
    ? "Admin"
    : (user.displayName || getCurrentDisplayName() || "Người dùng");
  let existingPostCount = currentPostCount;
  if (is_admin) {
    logPostStep("Tài khoản Admin; bỏ qua giới hạn số bài viết.");
  } else {
    logPostStep("Bắt đầu kiểm tra số bài viết hiện có trong Firestore.");
    try {
      const q = query(collection(db, "posts"), where("userId", "==", user.uid));
      const querySnapshot = await getDocs(q);
      existingPostCount = querySnapshot.size;
      logPostStep("Đã kiểm tra số bài viết: " + existingPostCount + ".");
      if (querySnapshot.size >= MAX_POSTS_PER_USER) {
        logPostStep("Dừng: đã đạt giới hạn số bài viết.");
        showPostError("Bạn đã đạt giới hạn tối đa 15 bài viết.");
        return;
      }
    } catch (error) {
      logPostStep("Lỗi khi kiểm tra số bài: " + getTechnicalErrorDetails(error));
      showPostError(getPostErrorMessage(error));
      return;
    }
  }

  if (!profileReady) {
    logPostStep("Dừng: hồ sơ tài khoản chưa sẵn sàng.");
    showPostError("Hồ sơ tài khoản đang được tải. Vui lòng thử lại.");
    return;
  }
  if (currentUserBanned) {
    logPostStep("Dừng: tài khoản đang bị khóa.");
    showPostError("Tài khoản của bạn đã bị khóa vĩnh viễn.");
    return;
  }
  if (isMigrating) {
    logPostStep("Dừng: đang chuyển bài viết cũ.");
    showPostError("Đang chuyển bài viết cũ. Vui lòng đợi.");
    return;
  }
  if ((recorder && recorder.state === "recording") || isFinalizingRecording) {
    logPostStep("Dừng: bản ghi âm chưa hoàn tất.");
    showPostError("Hãy dừng ghi âm và đợi bản ghi hoàn tất trước khi đăng.");
    return;
  }

  logPostStep("Bắt đầu kiểm tra file, định dạng MIME và dung lượng.");
  const selectedAttachments = collectAttachments();
  logPostStep("Đã chọn " + selectedAttachments.length + " tệp đính kèm.");
  if (selectedAttachments.length > MAX_ATTACHMENTS_PER_POST) {
    logPostStep("Dừng: vượt số lượng tệp đính kèm tối đa.");
    showPostError("Mỗi bài viết có thể đính kèm tối đa " + MAX_ATTACHMENTS_PER_POST + " tệp.");
    return;
  }
  selectedAttachments.forEach(function (attachment) {
    logPostStep(
      "Tệp được chọn: " + attachment.name + ", " + attachment.blob.size
        + " bytes, MIME=" + (attachment.type || "trống") + "."
    );
  });
  const title = titleInput.value.trim();
  const content = contentInput.value.trim();
  if (containsBlockedLanguage(title) || containsBlockedLanguage(content)) {
    logPostStep("Dừng: nội dung không vượt qua kiểm tra từ ngữ.");
    await rejectInappropriateContent();
    showPostError(formStatus.textContent || "Nội dung chứa từ ngữ không phù hợp.");
    return;
  }
  const oversizedAttachment = selectedAttachments.find(function (attachment) {
    return !MAX_FILE_SIZES[attachment.kind]
      || attachment.blob.size > MAX_FILE_SIZES[attachment.kind];
  });
  if (oversizedAttachment) {
    logPostStep("Dừng: tệp vượt giới hạn dung lượng (" + oversizedAttachment.name + ").");
    const maxSize = MAX_FILE_SIZES[oversizedAttachment.kind] || 0;
    const typeNames = { image: "Hình ảnh", video: "Video", audio: "Âm thanh" };
    const typeName = typeNames[oversizedAttachment.kind] || "Tệp";
    showPostError(typeName + " vượt quá " + (maxSize / (1024 * 1024)) + " MB/tệp.");
    return;
  }
  logPostStep("Kiểm tra tệp và nội dung hoàn tất.");

  const countBeforeSubmit = existingPostCount;
  isSubmitting = true;
  updateAuthControls();
  showPostProgress("Đang đăng bài...", 0);
  logPostStep("Đã khóa nút đăng; bắt đầu tạo bài viết.");

  const postAttachments = [];
  let postDataImageUrl = "";
  try {
    const postRef = doc(collection(db, "posts"));
    logPostStep("Đã tạo ID bài viết: " + postRef.id + ".");
    for (let index = 0; index < selectedAttachments.length; index += 1) {
      const attachment = selectedAttachments[index];
      const uploadedAttachment = await uploadAttachment(attachment, function (fileProgress) {
        const overallProgress = Math.round(
          ((index + fileProgress / 100) / selectedAttachments.length) * 90
        );
        showPostProgress(
          "Đang tải lên tệp " + (index + 1) + "/" + selectedAttachments.length + "...",
          overallProgress
        );
      });
      postAttachments.push(uploadedAttachment);
      if (attachment.kind === "image" && !postDataImageUrl) {
        postDataImageUrl = uploadedAttachment.url;
      }
    }

    showPostProgress("Đang lưu bài viết...", 95);
    logPostStep("Bắt đầu lưu metadata bài viết vào Firestore.");
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
    logPostStep("Đã lưu bài viết thành công vào Firestore.");

    currentCategory = null;
    updateCategoryNavigation();
    form.reset();
    pendingRecording = null;
    renderPreview();
    setRecordingStatus("Cho phép trình duyệt sử dụng micro khi được hỏi.", false);
    currentPostCount = Math.max(currentPostCount, countBeforeSubmit + 1);
    updateAuthControls();
    showPostSuccess();
  } catch (error) {
    logPostStep("Lỗi khi đăng bài: " + getTechnicalErrorDetails(error));
    showPostError(getPostErrorMessage(error));
  } finally {
    isSubmitting = false;
    updateAuthControls();
    logPostStep("Đã mở khóa lại nút Đăng bài.");
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

    const message = post.attachments.length
      ? "Đã xóa bài viết. Tệp trên Cloudinary vẫn còn; hãy xóa thủ công trong Cloudinary Console nếu cần."
      : "Đã xóa bài viết.";
    if (profilePage.hidden) {
      showStatus(message, false, true);
    } else {
      setProfilePageStatus(message, false);
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

// Ghi âm vẫn được hỗ trợ; bản ghi được tải lên Cloudinary cùng các tệp khác.
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
      subscribeToAdminGifts(user);
      currentPostCount = 0;
      currentViolationCount = 0;
      currentUserBanned = false;
      profileReady = false;
      if (!user && currentProfileUnsubscribe) {
        currentProfileUnsubscribe();
        currentProfileUnsubscribe = null;
      }
      if (!user && challengeDialog.open) {
        closeChallenge();
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
