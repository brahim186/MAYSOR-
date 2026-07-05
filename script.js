// ── EmailJS Init ──
  emailjs.init("tZynjADm4ILCFGfql");

  let currentYear, currentMonth;
  let selectedFullDateStr = "";
  
  const dateInput = document.getElementById('bk-date');
  const calendarPopup = document.getElementById('custom-calendar-popup');
  const monthYearLabel = document.getElementById('calendar-month-year');
  const daysContainer = document.getElementById('calendar-days-container');
  const timeSelect = document.getElementById('bk-time');

  // Initialize
  const now = new Date();
  currentYear = now.getFullYear();
  currentMonth = now.getMonth();

  // Set chat initial time dynamically to feel authentic
  document.getElementById('mia-start-time').textContent = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  function toggleCalendarPopup(event) {
    event.stopPropagation();
    if (calendarPopup.style.display === 'block') {
      calendarPopup.style.display = 'none';
    } else {
      calendarPopup.style.display = 'block';
      renderCalendar();
    }
  }

  function changeCalendarMonth(direction) {
    currentMonth += direction;
    if (currentMonth < 0) {
      currentMonth = 11;
      currentYear--;
    } else if (currentMonth > 11) {
      currentMonth = 0;
      currentYear++;
    }
    renderCalendar();
  }

  function renderCalendar() {
    const monthNames = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
    monthYearLabel.textContent = `${monthNames[currentMonth]} ${currentYear}`;
    
    daysContainer.innerHTML = '';
    
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
    const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();
    
    for (let i = 0; i < firstDayIndex; i++) {
      const emptyDiv = document.createElement('div');
      daysContainer.appendChild(emptyDiv);
    }
    
    const todayStr = new Date().toISOString().split('T')[0];
    
    for (let day = 1; day <= totalDays; day++) {
      const dayDiv = document.createElement('div');
      dayDiv.className = 'calendar-day';
      dayDiv.textContent = day;
      
      const loopDate = new Date(currentYear, currentMonth, day);
      const loopDayOfWeek = loopDate.getDay();
      const loopDateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      
      const isAllowedDay = (loopDayOfWeek === 1 || loopDayOfWeek === 3 || loopDayOfWeek === 5);
      const isPast = loopDateStr < todayStr;
      
      if (isAllowedDay && !isPast) {
        dayDiv.classList.add('allowed');
        if (loopDateStr === selectedFullDateStr) {
          dayDiv.classList.add('selected');
        }
        
        dayDiv.onclick = (e) => {
          e.stopPropagation();
          selectedFullDateStr = loopDateStr;
          const formattedText = `${String(day).padStart(2, '0')}/${String(currentMonth + 1).padStart(2, '0')}/${currentYear}`;
          dateInput.value = formattedText;
          calendarPopup.style.display = 'none';
          activateTimeSlots();
        };
      } else {
        dayDiv.classList.add('disabled');
        dayDiv.onclick = (e) => {
          e.stopPropagation();
        };
      }
      
      daysContainer.appendChild(dayDiv);
    }
  }

  document.addEventListener('click', function(event) {
    if (!event.target.closest('.date-input-wrapper')) {
      calendarPopup.style.display = 'none';
    }
  });

  /* ── Gestion des créneaux réservés via localStorage ── */
  function getBookedSlots() {
    try { return JSON.parse(localStorage.getItem('rihanio_bookings') || '{}'); }
    catch(e) { return {}; }
  }

  function bookSlot(dateStr, timeSlot) {
    const bookings = getBookedSlots();
    if (!bookings[dateStr]) bookings[dateStr] = [];
    if (!bookings[dateStr].includes(timeSlot)) bookings[dateStr].push(timeSlot);
    localStorage.setItem('rihanio_bookings', JSON.stringify(bookings));
  }

  function isSlotBooked(dateStr, timeSlot) {
    const bookings = getBookedSlots();
    return bookings[dateStr] && bookings[dateStr].includes(timeSlot);
  }

  function activateTimeSlots() {
    timeSelect.innerHTML = '';
    const allSlots = [
      "09:00 - 10:00",
      "10:30 - 11:30",
      "14:00 - 15:00",
      "15:30 - 16:30"
    ];

    timeSelect.disabled = false;
    let initialOption = document.createElement('option');
    initialOption.value = '';
    initialOption.textContent = '-- Choisir un créneau --';
    timeSelect.appendChild(initialOption);

    let hasAvailable = false;
    allSlots.forEach(slot => {
      let option = document.createElement('option');
      option.value = slot;
      if (isSlotBooked(selectedFullDateStr, slot)) {
        option.textContent = slot + ' — Réservé 🔒';
        option.disabled = true;
        option.style.color = '#999';
      } else {
        option.textContent = slot;
        hasAvailable = true;
      }
      timeSelect.appendChild(option);
    });

    if (!hasAvailable) {
      timeSelect.innerHTML = '';
      let noSlotOption = document.createElement('option');
      noSlotOption.value = '';
      noSlotOption.textContent = '⚠ Aucun créneau disponible ce jour';
      timeSelect.appendChild(noSlotOption);
      timeSelect.disabled = true;
    }
  }

  function submitBooking(event) {
    event.preventDefault();

    const name  = document.getElementById('bk-name').value.trim();
    const email = document.getElementById('bk-email').value.trim();
    const phone = document.getElementById('bk-phone').value.trim();
    const date  = document.getElementById('bk-date').value;
    const time  = document.getElementById('bk-time').value;

    if (!time) {
      alert("Veuillez choisir un créneau horaire valide.");
      return;
    }
    if (isSlotBooked(selectedFullDateStr, time)) {
      alert("Ce créneau vient d'être réservé. Veuillez en choisir un autre.");
      activateTimeSlots();
      return;
    }

    /* ── Générer un ID unique de confirmation ── */
    const confirmId = 'RDV-' + Date.now().toString(36).toUpperCase();

    /* ── Réserver le créneau, envoyer l'email et enregistrer dans Google Sheets ── */
    bookSlot(selectedFullDateStr, time);
    sendConfirmationEmail(name, email, phone, date, time, confirmId);
    sendToGoogleSheet(name, email, phone, date, time);

    alert("✅ Félicitations ! Votre rendez-vous est confirmé.\n📧 Un email de confirmation vous a été envoyé.");
    document.getElementById('main-booking-form').reset();
    selectedFullDateStr = "";
    timeSelect.disabled = true;
    timeSelect.innerHTML = '<option value="">Sélectionnez d\'abord une date</option>';
  }

  /* ------------------------------------------- */
  /* ENVOI DES DONNÉES VERS GOOGLE SHEETS         */
  /* ------------------------------------------- */
  // 1) Colle ici l'URL de ton Web App Google Apps Script (voir instructions ci-dessous).
  const GOOGLE_SHEET_WEB_APP_URL = "COLLE_ICI_L_URL_DE_TON_WEB_APP_GOOGLE";

  function sendToGoogleSheet(name, email, phone, date, time) {
    // Si l'URL n'a pas encore été configurée, on ne tente pas l'envoi.
    if (!GOOGLE_SHEET_WEB_APP_URL || GOOGLE_SHEET_WEB_APP_URL.indexOf("COLLE_ICI") !== -1) {
      console.warn("⚠ URL du Web App Google Sheets non configurée. Les données n'ont pas été envoyées à la feuille.");
      return;
    }

    // Les clés sont envoyées dans l'ordre des colonnes de la feuille :
    // Timestamp | Nom complet | Adresse e-mail | Numéro de téléphone | Date du rendez-vous | Heure disponible
    const formData = {
      nomComplet: name,
      email: email,
      telephone: phone,
      dateRendezVous: date,
      heureDisponible: time
    };

    fetch(GOOGLE_SHEET_WEB_APP_URL, {
      method: "POST",
      mode: "no-cors", // Le Web App Google ne renvoie pas d'en-têtes CORS lisibles, on ignore donc la réponse
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData)
    })
    .then(() => {
      console.log("✅ Données envoyées à Google Sheets.");
    })
    .catch((err) => {
      console.warn("⚠ Erreur lors de l'envoi vers Google Sheets:", err);
    });
  }

  /* ------------------------------------------- */
  /* ENVOI EMAIL DE CONFIRMATION (EmailJS)        */
  /* ------------------------------------------- */
  function sendConfirmationEmail(name, email, phone, date, time, confirmId) {

    const messageFR = `Bonjour ${name},

Nous espérons que vous allez bien.

Nous avons le plaisir de vous confirmer votre rendez-vous avec l'équipe Rihanio, selon les informations suivantes :

📅 Date        : ${date}
🕐 Heure       : ${time}
🔖 N° Dossier  : ${confirmId}
📞 Téléphone   : ${phone}

Nous vous prions de bien vouloir confirmer votre présence en répondant à cet e-mail.
En cas d'empêchement ou pour toute modification, n'hésitez pas à nous contacter au moins 24h à l'avance.

Nous nous réjouissons de vous accueillir prochainement.

Cordialement,
L'équipe RIHANIO
Agence Digitale & Management`;

    const messageAR = `عزيزي/عزيزتي ${name}،

نتمنى أن تكون بخير.

يسعدنا إبلاغكم بأنه قد تم تأكيد موعدكم مع فريق Rihanio، وذلك وفقاً للبيانات التالية:

📅 التاريخ      : ${date}
🕐 التوقيت      : ${time}
🔖 رقم الملف    : ${confirmId}
📞 رقم الهاتف   : ${phone}

نرجو منكم تأكيد حضوركم بالرد على هذا البريد الإلكتروني.
في حال وجود أي استفسارات أو الحاجة لتعديل الموعد، لا تترددوا في التواصل معنا قبل 24 ساعة على الأقل.

نتطلع للقائكم قريباً.

مع أطيب التحيات،
فريق RIHANIO
وكالة رقمية ومتعددة الخدمات`;

    const templateParams = {
      to_name:     name,
      to_email:    email,
      date_rdv:    date,
      heure_rdv:   time,
      confirm_id:  confirmId,
      telephone:   phone,
      message_fr:  messageFR,
      message_ar:  messageAR,
      reply_to:    'contact@rihanio.com'
    };

    emailjs.send("service_xyszcw5", "template_dqainy9", templateParams)
      .then(() => {
        console.log("✅ Email envoyé avec succès à " + email);
      })
      .catch((err) => {
        console.warn("⚠ Erreur EmailJS:", err);
      });
  }

  /* ------------------------------------------- */
  /* CHATBOT FUNCTIONS (MIA)         */
  /* ------------------------------------------- */
  const miaWindow = document.getElementById('mia-window');
  const miaInput = document.getElementById('mia-input');
  const miaChatBody = document.getElementById('mia-chat-body');
  
  let selectedLanguage = "";

  const langInterfaces = {
    ar: { dir: "rtl", align: "right", placeholder: "اطرح سؤالاً...", disclaimer: "⚠ الإجابات تولد تلقائياً وقد تحتوي على أخطاء. <a href='services.html'>مزيد من المعلومات</a>.", timeline: "اليوم", badge: "نسخة تجريبية", flexDir: "row-reverse" },
    mor: { dir: "rtl", align: "right", placeholder: "سولني شي حاجة...", disclaimer: "⚠ الأجوبة كتخرج أوتوماتيك وتقدر تغلط. <a href='services.html'>معلومات أكثر</a>.", timeline: "اليوم", badge: "نسخة تجريبية", flexDir: "row-reverse" },
    fr: { dir: "ltr", align: "left", placeholder: "Posez une question...", disclaimer: "⚠ Les réponses de l'IA peuvent contenir des erreurs. <a href='services.html'>Plus d'infos</a>.", timeline: "Aujourd'hui", badge: "Beta", flexDir: "row" },
    en: { dir: "ltr", align: "left", placeholder: "Ask a question...", disclaimer: "⚠ AI responses may contain inaccuracies. <a href='services.html'>More info</a>.", timeline: "Today", badge: "Beta", flexDir: "row" }
  };

  const langWelcomes = {
    ar: "ممتاز! تم تفعيل اللغة العربية. كيف يمكنني مساعدتك اليوم بخصوص خدمات Rihanio؟",
    mor: "صافي واجدة! دبا نهدرو بالدارجة. باش قدرنا نعاونوك اليوم فالمشروع ديالك؟",
    fr: "Parfait! Langue française activée. Comment puis-je vous aider aujourd'hui avec les services de Rihanio?",
    en: "Perfect! English language activated. How can I help you today with Rihanio's services?"
  };

  // Quick questions bank per language
  const quickQuestions = {
    ar: [
      { label: "🏠 ما هي خدمات Airbnb؟", text: "ما هي خدمات إدارة Airbnb التي تقدمونها؟" },
      { label: "📱 إدارة السوشيال ميديا", text: "كيف تديرون حسابات وسائل التواصل الاجتماعي؟" },
      { label: "🌐 تصميم مواقع", text: "ما هي خدمات تصميم وتطوير المواقع الإلكترونية لديكم؟" },
      { label: "📊 دراسة الجدوى", text: "ما هي خدمة دراسة الجدوى والنمذجة المالية؟" },
      { label: "📅 حجز موعد", text: "كيف يمكنني حجز موعد مع فريق Rihanio؟" },
      { label: "💰 الأسعار", text: "ما هي أسعار خدماتكم؟" }
    ],
    mor: [
      { label: "🏠 خدمات Airbnb", text: "شنو هي الخدمات ديال تسيير Airbnb لي عندكم؟" },
      { label: "📱 سوشيال ميديا", text: "كيفاش كتديرو الحسابات ديال السوشيال ميديا؟" },
      { label: "🌐 تصميم سيت", text: "شنو خدمات تصميم وبرمجة المواقع لي عندكم؟" },
      { label: "📊 دراسة الربح", text: "شنو هي خدمة دراسة الربحية ديال المشاريع؟" },
      { label: "📅 شد رنديفو", text: "كيفاش نشد رنديفو مع فريق Rihanio؟" },
      { label: "💰 الأثمنة", text: "شنو هي أثمنة الخدمات ديالكم؟" }
    ],
    fr: [
      { label: "🏠 Gestion Airbnb", text: "Quels sont vos services de gestion Airbnb ?" },
      { label: "📱 Réseaux sociaux", text: "Comment gérez-vous les réseaux sociaux ?" },
      { label: "🌐 Création de site", text: "Quels sont vos services de création de site web ?" },
      { label: "📊 Étude de rentabilité", text: "En quoi consiste l'étude de rentabilité ?" },
      { label: "📅 Prendre RDV", text: "Comment prendre rendez-vous avec l'équipe Rihanio ?" },
      { label: "💰 Tarifs", text: "Quels sont vos tarifs ?" }
    ],
    en: [
      { label: "🏠 Airbnb Management", text: "What Airbnb management services do you offer?" },
      { label: "📱 Social Media", text: "How do you manage social media accounts?" },
      { label: "🌐 Website Creation", text: "What website design and development services do you offer?" },
      { label: "📊 Profitability Study", text: "What is the profitability study service?" },
      { label: "📅 Book a Meeting", text: "How can I book a meeting with Rihanio's team?" },
      { label: "💰 Pricing", text: "What are your service prices?" }
    ]
  };

  // Predefined direct answers for quick chip questions (per language)
  const quickAnswers = {
    ar: {
      "ما هي خدمات إدارة Airbnb التي تقدمونها؟": "نقدم إدارة شاملة لعقاراتك على Airbnb تشمل: تحسين الإعلانات، التواصل مع المسافرين 24/7، تنسيق تسجيل الدخول والخروج، وتنفيذ استراتيجيات لرفع معدل الإشغال بنسبة تصل إلى +40%. 🏠 هل تريد جدولة دراسة ربحية لعقارك؟",
      "كيف تديرون حسابات وسائل التواصل الاجتماعي؟": "نتولى إنشاء المحتوى الكامل (صور ونصوص)، جدولة المنشورات، وتفاعل يومي مع جمهورك لبناء حضور رقمي قوي وجذب عملاء جدد. 📱 تواصل معنا لمناقشة استراتيجية مخصصة لعلامتك التجارية.",
      "ما هي خدمات تصميم وتطوير المواقع الإلكترونية لديكم؟": "نصمم مواقع تعريفية ومتاجر إلكترونية حديثة وسريعة ومتجاوبة مع جميع الأجهزة، مع تحسين SEO لجذب أكبر عدد من الزوار وتحويلهم إلى عملاء. 🌐 احجز موعداً لمناقشة مشروعك!",
      "ما هي خدمة دراسة الجدوى والنمذجة المالية؟": "نساعدك على تقييم الجدوى المالية لمشاريعك العقارية قبل الاستثمار. نُعدّ نماذج مالية دقيقة تتضمن التكاليف، العوائد المتوقعة، ونقطة التعادل لاتخاذ قرارات مستنيرة. 📊",
      "كيف يمكنني حجز موعد مع فريق Rihanio؟": "يمكنك حجز موعدك مباشرة من قسم 'احجز موعداً' في الموقع. اختر يوماً متاحاً (الاثنين أو الأربعاء أو الجمعة) والوقت المناسب، وستصلك رسالة تأكيد على بريدك الإلكتروني. 📅",
      "ما هي أسعار خدماتكم؟": "تختلف الأسعار حسب نوع الخدمة ونطاق المشروع. نوفر عروضاً مخصصة بعد فهم احتياجاتك. 💰 احجز استشارة مجانية الآن وسيقدم لك فريقنا عرضاً مفصلاً."
    },
    mor: {
      "شنو هي الخدمات ديال تسيير Airbnb لي عندكم؟": "عندنا خدمة تسيير Airbnb شاملة: تحسين الإعلانات، التواصل مع الضيوف 24/7، تنسيق الدخول والخروج، وزيادة المداخيل بـ +40% فالمعدل. 🏠 بغيتي نديرو دراسة ربحية للدار ديالك؟",
      "كيفاش كتديرو الحسابات ديال السوشيال ميديا؟": "كنديرو المحتوى كامل (صور ونصوص)، جدولة المنشورات، وتفاعل يومي مع الجمهور ديالك باش نبنيو ليك حضور قوي على النت ونجيبو ليك كليان جداد. 📱 كلمنا على المشروع ديالك!",
      "شنو خدمات تصميم وبرمجة المواقع لي عندكم؟": "كنصممو سيتات ويب وماغازي إلكترونية عصرية وسريعة ومتجاوبة مع جميع الأجهزة، مع تحسين SEO باش يلقاوك الناس فgoogle. 🌐 شد رنديفو ومناقشنا المشروع ديالك!",
      "شنو هي خدمة دراسة الربحية ديال المشاريع؟": "كنعاونوك تقيّم الجدوى المالية ديال مشروعك العقاري قبل ما تستثمر. كنديرو نماذج مالية دقيقة فيها التكاليف، الأرباح المتوقعة، ونقطة التعادل. 📊",
      "كيفاش نشد رنديفو مع فريق Rihanio؟": "تقدر تشد الرنديفو ديالك مباشرة من قسم 'احجز موعداً' فالسيت. اختار النهار (الاثنين، الأربعاء، أو الجمعة) والوقت لي مسلك، وغادي يجيك تأكيد على الإيميل. 📅",
      "شنو هي أثمنة الخدمات ديالكم؟": "الأثمنة كتختلف حسب نوع الخدمة وحجم المشروع. كنديرو عروض مخصصة بعد ما نفهمو احتياجاتك. 💰 شد استشارة مجانية دابا وفريقنا غادي يقدم ليك عرض مفصّل."
    },
    fr: {
      "Quels sont vos services de gestion Airbnb ?": "Notre service Airbnb Premium comprend: l'optimisation de vos annonces, la communication avec les voyageurs 24/7, la coordination des check-in/out et des stratégies pour augmenter vos revenus de +40% en moyenne. 🏠 Souhaitez-vous planifier une étude de rentabilité ?",
      "Comment gérez-vous les réseaux sociaux ?": "Nous prenons en charge la création de contenu complet (visuels et textes), la planification des publications et l'animation quotidienne de vos communautés pour bâtir une présence forte et attirer de nouveaux clients. 📱 Contactez-nous pour une stratégie personnalisée !",
      "Quels sont vos services de création de site web ?": "Nous concevons des sites vitrines et e-commerce modernes, ultra-rapides, responsives et optimisés SEO pour maximiser vos conversions et votre visibilité sur Google. 🌐 Réservez un RDV pour discuter de votre projet !",
      "En quoi consiste l'étude de rentabilité ?": "Nous analysons la viabilité financière de vos projets immobiliers avant tout investissement. Nos modèles incluent: coûts totaux, revenus prévisionnels, ROI et point mort pour des décisions éclairées. 📊",
      "Comment prendre rendez-vous avec l'équipe Rihanio ?": "Réservez directement depuis la section 'Prendre RDV' sur notre site. Choisissez un créneau disponible (Lundi, Mercredi ou Vendredi) et l'heure qui vous convient. Vous recevrez une confirmation par email. 📅",
      "Quels sont vos tarifs ?": "Nos tarifs varient selon le type de service et la portée du projet. Nous proposons des offres personnalisées après analyse de vos besoins. 💰 Réservez une consultation gratuite et notre équipe vous préparera un devis détaillé !"
    },
    en: {
      "What Airbnb management services do you offer?": "Our Premium Airbnb service includes: listing optimization, 24/7 guest communication, check-in/out coordination, and revenue strategies that boost your income by +40% on average. 🏠 Would you like to schedule a profitability assessment?",
      "How do you manage social media accounts?": "We handle full content creation (visuals and copy), post scheduling, and daily community engagement to build a strong online presence and attract new clients. 📱 Contact us for a personalized strategy!",
      "What website design and development services do you offer?": "We design modern, fast, mobile-responsive showcase sites and e-commerce stores with SEO optimization to maximize your conversions and Google visibility. 🌐 Book a meeting to discuss your project!",
      "What is the profitability study service?": "We analyze the financial viability of your real estate projects before you invest. Our models include: total costs, projected revenues, ROI, and break-even point for informed decisions. 📊",
      "How can I book a meeting with Rihanio's team?": "Book directly from the 'Book a Meeting' section on our site. Choose an available slot (Monday, Wednesday or Friday) and your preferred time. You'll receive a confirmation email. 📅",
      "What are your service prices?": "Our pricing varies depending on the service type and project scope. We offer personalized quotes after understanding your needs. 💰 Book a free consultation and our team will prepare a detailed proposal!"
    }
  };

  function sendQuickQuestion(text) {
    miaInput.value = text;
    hideQuickChips();

    const timeStr = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const config = langInterfaces[selectedLanguage];

    // Show user message
    const userMsgHTML = `
      <div class="mia-msg-wrapper user" style="flex-direction: ${config.flexDir}; align-self: flex-end;">
        <div class="mia-avatar" style="background:#555; ${config.dir === 'rtl' ? 'margin-right:10px; margin-left:0;' : 'margin-left:10px; margin-right:0;'}">
          <img src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80" alt="User">
        </div>
        <div class="mia-bubble-container">
          <div class="mia-bubble" style="background: var(--purple); color: var(--white); ${config.dir === 'rtl' ? 'border-top-right-radius:14px; border-top-left-radius:2px;' : 'border-top-left-radius:14px; border-top-right-radius:2px;'}">${text}</div>
          <div class="mia-time" style="align-self: ${config.dir === 'rtl' ? 'flex-end' : 'flex-start'};">${timeStr}</div>
        </div>
      </div>
    `;
    miaChatBody.insertAdjacentHTML('beforeend', userMsgHTML);
    miaInput.value = '';
    miaChatBody.scrollTop = miaChatBody.scrollHeight;

    // Get direct answer from predefined map
    const langAnswers = quickAnswers[selectedLanguage] || {};
    const directAnswer = langAnswers[text] || getSmartFallback(text);

    // Show brief typing indicator then answer
    const typingId = 'typing-chip-' + Date.now();
    const typingHTML = `
      <div class="mia-msg-wrapper bot" id="${typingId}" style="flex-direction: ${config.flexDir}; align-self: flex-start;">
        <div class="mia-avatar" style="${config.dir === 'rtl' ? 'margin-left:10px; margin-right:0;' : 'margin-right:10px; margin-left:0;'}">
          <img src="${document.querySelector('.mia-msg-wrapper.bot .mia-avatar img') ? document.querySelector('.mia-msg-wrapper.bot .mia-avatar img').src : ''}" alt="Mia AI">
        </div>
        <div class="mia-bubble-container">
          <div class="mia-bubble" style="background: white; color: #111;">
            <span style="display:inline-flex;gap:4px;align-items:center;padding:2px 0;">
              <span style="width:7px;height:7px;border-radius:50%;background:#bbb;animation:mia-dot 1.2s infinite ease-in-out;animation-delay:0s;display:inline-block;"></span>
              <span style="width:7px;height:7px;border-radius:50%;background:#bbb;animation:mia-dot 1.2s infinite ease-in-out;animation-delay:0.2s;display:inline-block;"></span>
              <span style="width:7px;height:7px;border-radius:50%;background:#bbb;animation:mia-dot 1.2s infinite ease-in-out;animation-delay:0.4s;display:inline-block;"></span>
            </span>
          </div>
        </div>
      </div>
    `;
    miaChatBody.insertAdjacentHTML('beforeend', typingHTML);
    miaChatBody.scrollTop = miaChatBody.scrollHeight;

    setTimeout(() => {
      const typingEl = document.getElementById(typingId);
      if (typingEl) typingEl.remove();

      const replyTimeStr = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
      const avatarSrc = document.querySelector('#mia-welcome-wrapper .mia-avatar img') ? document.querySelector('#mia-welcome-wrapper .mia-avatar img').src : '';
      const botMsgHTML = `
        <div class="mia-msg-wrapper bot" style="flex-direction: ${config.flexDir}; align-self: flex-start;">
          <div class="mia-avatar" style="${config.dir === 'rtl' ? 'margin-left:10px; margin-right:0;' : 'margin-right:10px; margin-left:0;'}">
            <img src="${avatarSrc}" alt="Mia AI">
          </div>
          <div class="mia-bubble-container">
            <div class="mia-bubble" style="background: white; color: #111; ${config.dir === 'rtl' ? 'border-top-left-radius:14px; border-top-right-radius:2px;' : 'border-top-right-radius:14px; border-top-left-radius:2px;'}">${directAnswer}</div>
            <div class="mia-time" style="align-self: ${config.dir === 'rtl' ? 'flex-start' : 'flex-end'};">${replyTimeStr}</div>
          </div>
        </div>
      `;
      miaChatBody.insertAdjacentHTML('beforeend', botMsgHTML);
      miaChatBody.scrollTop = miaChatBody.scrollHeight;
    }, 800);
  }

  function showQuickChips(lang) {
    const config = langInterfaces[lang];
    const questions = quickQuestions[lang] || [];
    const isRtl = config.dir === 'rtl';
    const chipsHTML = `
      <div class="mia-quick-chips" id="mia-quick-chips" style="${isRtl ? 'direction:rtl; justify-content:flex-end;' : ''}">
        ${questions.map(q => `<button class="mia-chip" onclick="sendQuickQuestion('${q.text.replace(/'/g, "\\'")}')">${q.label}</button>`).join('')}
      </div>
    `;
    miaChatBody.insertAdjacentHTML('beforeend', chipsHTML);
    miaChatBody.scrollTop = miaChatBody.scrollHeight;
  }

  // Hide chips when user sends a message
  function hideQuickChips() {
    const chips = document.getElementById('mia-quick-chips');
    if (chips) chips.remove();
  }

  function toggleQuickChips() {
    const existing = document.getElementById('mia-quick-chips');
    if (existing) {
      existing.remove();
    } else {
      showQuickChips(selectedLanguage);
    }
  }

  function toggleMiaChat() {
    if (miaWindow.style.display === 'flex') {
      miaWindow.style.display = 'none';
    } else {
      miaWindow.style.display = 'flex';
      miaChatBody.scrollTop = miaChatBody.scrollHeight;
    }
  }

  function handleMiaKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMiaMessage();
    }
  }

  function selectMiaLanguage(lang) {
    selectedLanguage = lang;
    const config = langInterfaces[lang];

    miaWindow.style.direction = config.dir;
    miaWindow.style.textAlign = config.align;
    miaInput.placeholder = config.placeholder;
    miaInput.disabled = false;
    const suggestBtn = document.getElementById('mia-suggestions-toggle');
    if (suggestBtn) { suggestBtn.disabled = false; suggestBtn.style.opacity = '1'; suggestBtn.style.cursor = 'pointer'; }
    
    document.getElementById('mia-disclaimer-text').innerHTML = config.disclaimer;
    document.getElementById('mia-timeline-text').textContent = config.timeline;
    document.getElementById('mia-badge-text').textContent = config.badge;
    document.getElementById('mia-header-element').style.flexDirection = config.flexDir;
    document.getElementById('mia-header-element').querySelector('.mia-header-title').style.flexDirection = config.flexDir;
    document.getElementById('mia-header-element').querySelector('.mia-header-actions').style.flexDirection = config.flexDir;
    document.getElementById('mia-input-box-container').style.flexDirection = config.flexDir;

    if(config.dir === "rtl") {
      document.getElementById('mia-send-button-element').style.transform = "scaleX(-1)";
    } else {
      document.getElementById('mia-send-button-element').style.transform = "scaleX(1)";
    }

    document.getElementById('mia-lang-container').style.display = "none";

    const timeStr = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const welcomeHTML = `
      <div class="mia-msg-wrapper bot" style="flex-direction: ${config.flexDir}; margin-top: 10px;">
        <div class="mia-avatar" style="${config.dir === 'rtl' ? 'margin-left:10px; margin-right:0;' : 'margin-right:10px; margin-left:0;'}">
          <img src="data:image/jpeg;base64,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" alt="Mia AI">
        </div>
        <div class="mia-bubble-container">
          <div class="mia-bubble" style="background: white; color: #111; ${config.dir === 'rtl' ? 'border-top-left-radius:14px; border-top-right-radius:2px;' : 'border-top-right-radius:14px; border-top-left-radius:2px;'}">${langWelcomes[lang]}</div>
          <div class="mia-time" style="align-self: ${config.dir === 'rtl' ? 'flex-start' : 'flex-end'};">${timeStr}</div>
        </div>
      </div>
    `;
    miaChatBody.insertAdjacentHTML('beforeend', welcomeHTML);
    miaChatBody.scrollTop = miaChatBody.scrollHeight;
    showQuickChips(lang);
  }

  // =============================================
  // ضع مفتاح Gemini API الخاص بك هنا
  // احصل عليه مجاناً من: https://aistudio.google.com/app/apikey
  const GEMINI_API_KEY = "AQ.Ab8RN6KjtnK88VhseVMEBcZ26yqT4Ir_EcafQbrAK4WE26YeFg";
  // =============================================

  async function sendMiaMessage() {
    const text = miaInput.value.trim();
    if (!text) return;

    hideQuickChips();

    const timeStr = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const config = langInterfaces[selectedLanguage];

    const userMsgHTML = `
      <div class="mia-msg-wrapper user" style="flex-direction: ${config.flexDir}; align-self: flex-end;">
        <div class="mia-avatar" style="background:#555; ${config.dir === 'rtl' ? 'margin-right:10px; margin-left:0;' : 'margin-left:10px; margin-right:0;'}">
          <img src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80" alt="User">
        </div>
        <div class="mia-bubble-container">
          <div class="mia-bubble" style="background: var(--purple); color: var(--white); ${config.dir === 'rtl' ? 'border-top-right-radius:14px; border-top-left-radius:2px;' : 'border-top-left-radius:14px; border-top-right-radius:2px;'}">${text}</div>
          <div class="mia-time" style="align-self: ${config.dir === 'rtl' ? 'flex-end' : 'flex-start'};">${timeStr}</div>
        </div>
      </div>
    `;
    miaChatBody.insertAdjacentHTML('beforeend', userMsgHTML);
    miaInput.value = '';
    miaChatBody.scrollTop = miaChatBody.scrollHeight;

    // مؤشر "جاري الكتابة..."
    const typingId = 'typing-' + Date.now();
    const typingHTML = `
      <div class="mia-msg-wrapper bot" id="${typingId}" style="flex-direction: ${config.flexDir}; align-self: flex-start;">
        <div class="mia-avatar" style="${config.dir === 'rtl' ? 'margin-left:10px; margin-right:0;' : 'margin-right:10px; margin-left:0;'}">
          <img src="data:image/jpeg;base64,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" alt="Mia AI">
        </div>
        <div class="mia-bubble-container">
          <div class="mia-bubble" style="background: white; color: #111; ${config.dir === 'rtl' ? 'border-top-left-radius:14px; border-top-right-radius:2px;' : 'border-top-right-radius:14px; border-top-left-radius:2px;'}">
            <span style="display:inline-flex;gap:4px;align-items:center;padding:2px 0;">
              <span style="width:7px;height:7px;border-radius:50%;background:#bbb;animation:mia-dot 1.2s infinite ease-in-out;animation-delay:0s;display:inline-block;"></span>
              <span style="width:7px;height:7px;border-radius:50%;background:#bbb;animation:mia-dot 1.2s infinite ease-in-out;animation-delay:0.2s;display:inline-block;"></span>
              <span style="width:7px;height:7px;border-radius:50%;background:#bbb;animation:mia-dot 1.2s infinite ease-in-out;animation-delay:0.4s;display:inline-block;"></span>
            </span>
          </div>
        </div>
      </div>
    `;
    miaChatBody.insertAdjacentHTML('beforeend', typingHTML);
    miaChatBody.scrollTop = miaChatBody.scrollHeight;

    try {
      const systemPrompt = `أنت MIA، مساعدة ذكية واحترافية لشركة Rihanio، وكالة رقمية متخصصة في:
- إدارة حسابات وسائل التواصل الاجتماعي (تصميم، محتوى، نشر)
- تصميم وتطوير المواقع الإلكترونية والمتاجر الإلكترونية
- إدارة Airbnb والإيجارات الموسمية (إدارة متكاملة 24/7، زيادة الإيرادات بـ +40%)
- دراسات الجدوى المالية للعقارات والمشاريع

قواعد مهمة:
- أجب دائماً بنفس لغة المستخدم (العربية الفصحى، الدارجة المغربية، الفرنسية، أو الإنجليزية)
- اللغة المختارة حالياً: ${selectedLanguage}
- كن ودوداً، محترفاً، ومفيداً
- اقترح دائماً حجز موعد عند الإجابة على أسئلة خدمات Rihanio
- الردود يجب أن تكون مختصرة ومباشرة (3-4 جمل كحد أقصى)
- لا تذكر أنك Gemini أو AI من Google، أنت MIA فقط`;

      // جرب gemini-2.0-flash أولاً ثم gemini-1.5-flash كبديل
      let response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: systemPrompt }] },
            contents: [{ role: "user", parts: [{ text: text }] }],
            generationConfig: { maxOutputTokens: 300, temperature: 0.7 }
          })
        }
      );

      // إذا فشل النموذج الأول جرب الثاني
      if (!response.ok) {
        response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              system_instruction: { parts: [{ text: systemPrompt }] },
              contents: [{ role: "user", parts: [{ text: text }] }],
              generationConfig: { maxOutputTokens: 300, temperature: 0.7 }
            })
          }
        );
      }

      const data = await response.json();
      const typingEl = document.getElementById(typingId);
      if (typingEl) typingEl.remove();

      let botReply = "";
      if (data.candidates && data.candidates[0] && data.candidates[0].content) {
        botReply = data.candidates[0].content.parts[0].text;
      } else if (data.error) {
        console.warn("Gemini API error:", data.error.message);
        botReply = getSmartFallback(text);
      } else {
        botReply = getSmartFallback(text);
      }

      const replyTimeStr = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
      const botMsgHTML = `
        <div class="mia-msg-wrapper bot" style="flex-direction: ${config.flexDir}; align-self: flex-start;">
          <div class="mia-avatar" style="${config.dir === 'rtl' ? 'margin-left:10px; margin-right:0;' : 'margin-right:10px; margin-left:0;'}">
            <img src="data:image/jpeg;base64,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" alt="Mia AI">
          </div>
          <div class="mia-bubble-container">
            <div class="mia-bubble" style="background: white; color: #111; ${config.dir === 'rtl' ? 'border-top-left-radius:14px; border-top-right-radius:2px;' : 'border-top-right-radius:14px; border-top-left-radius:2px;'}">${botReply}</div>
            <div class="mia-time" style="align-self: ${config.dir === 'rtl' ? 'flex-start' : 'flex-end'};">${replyTimeStr}</div>
          </div>
        </div>
      `;
      miaChatBody.insertAdjacentHTML('beforeend', botMsgHTML);
      miaChatBody.scrollTop = miaChatBody.scrollHeight;
      showQuickChips(selectedLanguage);

    } catch (error) {
      // خطأ في الشبكة أو الاتصال → نستخدم الردود الذكية بدل رسالة الخطأ
      const typingEl = document.getElementById(typingId);
      if (typingEl) typingEl.remove();

      const botReply = getSmartFallback(text);
      const replyTimeStr = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
      const fallbackMsgHTML = `
        <div class="mia-msg-wrapper bot" style="flex-direction: ${config.flexDir}; align-self: flex-start;">
          <div class="mia-avatar" style="${config.dir === 'rtl' ? 'margin-left:10px; margin-right:0;' : 'margin-right:10px; margin-left:0;'}">
            <img src="data:image/jpeg;base64,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" alt="Mia AI">
          </div>
          <div class="mia-bubble-container">
            <div class="mia-bubble" style="background: white; color: #111; ${config.dir === 'rtl' ? 'border-top-left-radius:14px; border-top-right-radius:2px;' : 'border-top-right-radius:14px; border-top-left-radius:2px;'}">${botReply}</div>
            <div class="mia-time" style="align-self: ${config.dir === 'rtl' ? 'flex-start' : 'flex-end'};">${replyTimeStr}</div>
          </div>
        </div>
      `;
      miaChatBody.insertAdjacentHTML('beforeend', fallbackMsgHTML);
      miaChatBody.scrollTop = miaChatBody.scrollHeight;
      showQuickChips(selectedLanguage);
      console.warn("Gemini API unavailable, using smart fallback.", error);
    }
  }

  // ردود ذكية احتياطية (نفس منطق الملف الأصلي) تعمل عند فشل API
  function getSmartFallback(text) {
    const lowText = text.toLowerCase();
    let botResponse = "";

    if (selectedLanguage === "ar") {
      botResponse = "شكراً لرسالتك! سيقوم أحد مستشاري فريق Rihanio بمراجعة طلبك والتواصل معك في أقرب وقت. يمكنك أيضاً حجز موعد مباشرة عبر الموقع.";
      if (lowText.includes('اربنب') || lowText.includes('airbnb') || lowText.includes('عقار')) {
        botResponse = "تتيح لك خدمة تسيير Airbnb Premium زيادة عوائدك بنسبة 40% في المتوسط بفضل إدارتنا المتكاملة 24/7. هل ترغب في جدولة دراسة ربحية لعقارك؟";
      } else if (lowText.includes('موقع') || lowText.includes('ويب') || lowText.includes('برمجة')) {
        botResponse = "نحن نتميز بتصميم مواقع تعريفية ومتاجر إلكترونية حديثة، فائقة السرعة ومتوافقة مع معايير الـ SEO لجذب أكبر عدد من العملاء.";
      } else if (lowText.includes('موعد') || lowText.includes('حجز')) {
        botResponse = "يمكنك اختيار الوقت المناسب لك مباشرة من خلال قسم 'طلب موعد' على موقعنا وسيصلك تأكيد الحجز عبر البريد الإلكتروني.";
      }
    }
    else if (selectedLanguage === "mor") {
      botResponse = "لهلا يخطيك، شكراً على الميساج ديالك! واحد من الفريق ديال Rihanio غادي يجاوبك فبلاصة. تقدر كاع تشد رنديفو ديريكت من السيت.";
      if (lowText.includes('اربنب') || lowText.includes('airbnb') || lowText.includes('دار') || lowText.includes('عقار')) {
        botResponse = "الخدمة ديال تسيير Airbnb Premium كطلع ليك المداخيل بـ 40% فالمعدل حيت كنهزو عليك ثقل الكراء والمقابلات 24/7. واش بغيتي نديرو دراسة للربح ديال دارك؟";
      } else if (lowText.includes('موقع') || lowText.includes('سيت') || lowText.includes('ويب')) {
        botResponse = "كنقادو سيتات ويب ومتاجر إلكترونية ناضية، خفيفة وبديزاين عصري لي يجيب ليك كليان جداد تال عندك.";
      } else if (lowText.includes('موعد') || lowText.includes('رنديفو') || lowText.includes('بغات تشد')) {
        botResponse = "تقدر تعزل النهار والوقت لي مسلكك فالفورمولير ديال الحجز الفوق، ومن بعد كيوصلك تأكيد على الإيميل ديالك.";
      }
    }
    else if (selectedLanguage === "en") {
      botResponse = "Thank you for your message! A consultant from Rihanio's team will review your request and get back to you shortly. You can also book an appointment directly through our form.";
      if (lowText.includes('airbnb') || lowText.includes('property') || lowText.includes('rental')) {
        botResponse = "Our Premium Airbnb Management helps increase your revenue by 40% on average with 24/7 support. Would you like to schedule a profitability assessment?";
      } else if (lowText.includes('website') || lowText.includes('web') || lowText.includes('development')) {
        botResponse = "We design modern, fast, and SEO-optimized landing pages and e-commerce stores to scale up your sales.";
      } else if (lowText.includes('book') || lowText.includes('appointment') || lowText.includes('meeting')) {
        botResponse = "You can instantly select your preferred slot in our booking section and you'll receive a confirmation email.";
      }
    }
    else {
      botResponse = "Merci pour votre message! Un conseiller de l'équipe Rihanio va analyser votre demande et vous recontactera sous peu. Vous pouvez également réserver un créneau via notre formulaire.";
      if (lowText.includes('airbnb') || lowText.includes('immob') || lowText.includes('location')) {
        botResponse = "Notre service Premium Airbnb vous permet d'augmenter vos revenus de +40% en moyenne grâce à notre gestion intégrale 24/7. Souhaitez-vous planifier une étude de rentabilité?";
      } else if (lowText.includes('site') || lowText.includes('web') || lowText.includes('digital')) {
        botResponse = "Nous concevons des sites vitrines et e-commerce modernes, ultra-rapides et optimisés SEO pour maximiser vos conversions.";
      } else if (lowText.includes('rdv') || lowText.includes('rendez-vous') || lowText.includes('reserver')) {
        botResponse = "Vous pouvez choisir votre créneau préféré directement dans la section 'Prendre RDV' de notre site web. Vous recevrez une confirmation par e-mail.";
      }
    }

    return botResponse;
  }

  /* ================================================
     LANGUAGE SWITCHER (i18n)
  ================================================ */
  const translations = {
    fr: {
      nav_services: "Services",
      nav_about: "Qui sommes-nous ?",
      nav_rdv: "Prendre RDV",
      nav_contact: "Contact",
      nav_cta: "Réserver un RDV",
      badge: "Agence Digitale & Management",
      hero_h1_1: "Propulsez votre",
      hero_h1_2: "visibilité",
      hero_h1_3: "et vos",
      hero_h1_4: "rendements immobiliers",
      hero_h1_5: "au niveau supérieur.",
      hero_sub: "Nous combinons la puissance du digital et l'expertise immobilière pour maximiser vos performances et accélérer votre croissance.",
      hero_cta1: "Prendre RDV en ligne →",
      hero_cta2: "Voir nos services",
      metric1: "Croissance organique",
      metric2: "Taux d'occupation Airbnb",
      metric3: "Retour sur investissement",
      services_label: "Nos expertises",
      services_title: "Des solutions <span>complètes</span> sur mesure",
      s1_title: "Gestion des Réseaux Sociaux",
      s1_text: "Création de contenu complet (visuels et textes), planification des publications, et animation quotidienne de vos communautés pour bâtir une présence forte et engagée.",
      s2_title: "Création de Site Internet",
      s2_text: "Conception et développement de sites vitrines et de boutiques e-commerce modernes, rapides et adaptés aux mobiles.",
      s3_title: "Gestion Airbnb & Locations Saisonnières",
      s3_text: "Prise en charge intégrale de vos biens en location de courte durée. Nous optimisons vos annonces pour maximiser le taux d'occupation, gérons la communication avec les voyageurs 24/7, coordonnons les entrées/sorties et mettons en place des stratégies pour offrir une expérience client irréprochable.",
      s4_title: "Étude de Rentabilité & Modélisation Financière",
      s4_text: "Nous aidons les entrepreneurs et les investisseurs immobiliers à valider la viabilité financière de leurs projets avant de s'engager.",
      s5_pill: "Rihanio Studio",
      s5_title: "Services Audiovisuels Événementiels",
      s5_text: "Rihanio Studio accompagne vos événements avec une expertise audiovisuelle sur-mesure. Nous capturons l'essence de vos moments forts à travers une approche cinématographique et professionnelle.",
      s5_stat1: "Cinématographique",
      s5_stat2: "Sur-mesure",
      cta_card_title: "Prêt à scaler ?",
      cta_card_text: "Discutons de vos objectifs et construisons ensemble votre stratégie de croissance.",
      cta_card_btn: "Prendre rendez-vous →",
      rdv_label: "Planification",
      rdv_title: "Réserver un",
      rdv_title2: "Rendez-vous",
      rdv_sub: "Choisissez un créneau disponible (Lundi, Mercredi ou Vendredi) et recevez votre confirmation par e-mail.",
      bk_name: "Nom complet",
      bk_name_ph: "Votre nom complet",
      bk_email: "Adresse e-mail",
      bk_phone: "Numéro de téléphone",
      bk_btn: "Confirmer le rendez-vous",
      contact_label: "Contact",
      contact_title: "Parlons de votre",
      contact_title2: "projet",
      contact_sub: "Laissez-nous votre nom, e-mail, <b>numéro de téléphone</b> et les détails de votre projet. Nous vous répondrons sous 24h.",
      contact_name_ph: "Votre nom complet",
      contact_email_ph: "Votre adresse e-mail",
      contact_phone_ph: "Votre numéro de téléphone (Ex: +212...)",
      contact_msg_ph: "Décrivez votre projet...",
      contact_btn: "Envoyer le message",
      or_text: "ou",
      about_badge: "Agence Digitale & Management",
      about_title: "Qui Sommes-nous ?",
      about_text: "Nous sommes une agence digitale spécialisée dans l'accompagnement des professionnels, des entreprises et des institutions pour concrétiser leurs visions. Fondée par un expert passionné du digital et de la finance, notre agence crée des expériences numériques uniques qui marquent les esprits à travers des services de développement web sur-mesure, de marketing digital stratégique, de gestion professionnelle des réseaux sociaux (Community Management), et de production audiovisuelle (photographie et vidéo) haute définition.",
      founder_label: "Le mot du fondateur",
      founder_quote: "Chez Rihanio, nous croyons que chaque projet est unique et mérite une approche d'excellence. En combinant mon expertise en ingénierie de gestion et ma passion pour la création visuelle et digitale, j'ai voulu créer une agence capable d'offrir aux entreprises une vision à 360°. Notre mission est simple : transformer vos idées en succès mesurables et marquer durablement votre empreinte numérique.",
      founder_role: "Fondateur & Directeur de l'Agence",
      about_cta: "Prendre RDV en ligne →",
      dir: "ltr"
    },
    en: {
      nav_services: "Services",
      nav_about: "About Us",
      nav_rdv: "Book a Meeting",
      nav_contact: "Contact",
      nav_cta: "Book a Meeting",
      badge: "Digital Agency & Management",
      hero_h1_1: "Elevate your",
      hero_h1_2: "visibility",
      hero_h1_3: "and your",
      hero_h1_4: "real estate returns",
      hero_h1_5: "to the next level.",
      hero_sub: "We combine the power of digital marketing with real estate expertise to maximize your performance and accelerate your growth.",
      hero_cta1: "Book a Meeting →",
      hero_cta2: "Our Services",
      metric1: "Organic Growth",
      metric2: "Airbnb Occupancy Rate",
      metric3: "Return on Investment",
      services_label: "Our expertise",
      services_title: "Complete <span>tailored</span> solutions",
      s1_title: "Social Media Management",
      s1_text: "Full content creation (visuals and copy), publication scheduling, and daily community engagement to build a strong, active presence.",
      s2_title: "Website Creation",
      s2_text: "Design and development of modern, fast, mobile-friendly showcase sites and e-commerce stores.",
      s3_title: "Airbnb & Short-Term Rental Management",
      s3_text: "Full management of your short-term rental properties. We optimize your listings to maximize occupancy, handle guest communication 24/7, coordinate check-ins/outs, and implement strategies for an outstanding guest experience.",
      s4_title: "Profitability Study & Financial Modeling",
      s4_text: "We help entrepreneurs and real estate investors validate the financial viability of their projects before committing.",
      s5_pill: "Rihanio Studio",
      s5_title: "Event Audiovisual Services",
      s5_text: "Rihanio Studio covers your events with tailor-made audiovisual expertise. We capture the essence of your key moments through a cinematic and professional approach.",
      s5_stat1: "Cinematic",
      s5_stat2: "Tailor-made",
      cta_card_title: "Ready to scale?",
      cta_card_text: "Let's discuss your goals and build your growth strategy together.",
      cta_card_btn: "Book a meeting →",
      rdv_label: "Scheduling",
      rdv_title: "Book an",
      rdv_title2: "Appointment",
      rdv_sub: "Choose an available slot (Monday, Wednesday or Friday) and receive your confirmation by email.",
      bk_name: "Full name",
      bk_name_ph: "Your full name",
      bk_email: "Email address",
      bk_phone: "Phone number",
      bk_btn: "Confirm appointment",
      contact_label: "Contact",
      contact_title: "Let's talk about your",
      contact_title2: "project",
      contact_sub: "Leave us your name, email, <b>phone number</b> and project details. We'll reply within 24 hours.",
      contact_name_ph: "Your full name",
      contact_email_ph: "Your email address",
      contact_phone_ph: "Your phone number (e.g. +212...)",
      contact_msg_ph: "Describe your project...",
      contact_btn: "Send message",
      or_text: "or",
      about_badge: "Digital Agency & Management",
      about_title: "Who Are We?",
      about_text: "We are a digital agency specialized in supporting professionals, businesses, and institutions in bringing their visions to life. Founded by an expert passionate about digital and finance, our agency creates unique digital experiences that leave a lasting impression through tailor-made web development services, strategic digital marketing, professional social media management (Community Management), and high-definition audiovisual production (photography and video).",
      founder_label: "A word from the founder",
      founder_quote: "At Rihanio, we believe that every project is unique and deserves an approach of excellence. By combining my expertise in management engineering with my passion for visual and digital creation, I wanted to build an agency capable of offering businesses a 360° vision. Our mission is simple: turn your ideas into measurable success and leave a lasting digital footprint.",
      founder_role: "Founder & Agency Director",
      about_cta: "Book a Meeting →",
      dir: "ltr"
    },
    ar: {
      nav_services: "الخدمات",
      nav_about: "من نحن؟",
      nav_rdv: "احجز موعداً",
      nav_contact: "تواصل معنا",
      nav_cta: "احجز موعداً",
      badge: "وكالة رقمية وإدارة عقارية",
      hero_h1_1: "ارتقِ بـ",
      hero_h1_2: "حضورك الرقمي",
      hero_h1_3: "وزد",
      hero_h1_4: "عوائدك العقارية",
      hero_h1_5: "إلى مستوى أعلى.",
      hero_sub: "نجمع بين قوة التسويق الرقمي والخبرة العقارية لتعظيم أدائك وتسريع نموك.",
      hero_cta1: "احجز موعداً →",
      hero_cta2: "خدماتنا",
      metric1: "نمو عضوي",
      metric2: "معدل إشغال Airbnb",
      metric3: "العائد على الاستثمار",
      services_label: "خبراتنا",
      services_title: "حلول <span>متكاملة</span> مخصصة",
      s1_title: "إدارة وسائل التواصل الاجتماعي",
      s1_text: "إنشاء محتوى متكامل (صور ونصوص)، جدولة المنشورات، وتنشيط مجتمعاتك يومياً لبناء حضور قوي وفعّال.",
      s2_title: "تصميم وتطوير المواقع الإلكترونية",
      s2_text: "تصميم وبرمجة مواقع عرض ومتاجر إلكترونية حديثة وسريعة ومتجاوبة مع جميع الأجهزة.",
      s3_title: "إدارة Airbnb والإيجارات القصيرة",
      s3_text: "إدارة شاملة لعقاراتك المخصصة للإيجار القصير. نُحسّن إعلاناتك لرفع معدل الإشغال، ونتولى التواصل مع المسافرين على مدار 24/7، وننسّق عمليات تسجيل الدخول والخروج لتقديم تجربة لا تُنسى.",
      s4_title: "دراسة الجدوى والنمذجة المالية",
      s4_text: "نساعد رواد الأعمال والمستثمرين العقاريين على التحقق من الجدوى المالية لمشاريعهم قبل الالتزام بها.",
      s5_pill: "Rihanio Studio",
      s5_title: "الخدمات السمعية البصرية للفعاليات",
      s5_text: "يرافق Rihanio Studio فعالياتك بخبرة سمعية بصرية مخصصة. نلتقط جوهر لحظاتك المميزة من خلال أسلوب سينمائي واحترافي.",
      s5_stat1: "سينمائي",
      s5_stat2: "مخصص",
      cta_card_title: "هل أنت مستعد للانطلاق؟",
      cta_card_text: "دعنا نناقش أهدافك ونبني استراتيجية نموك معاً.",
      cta_card_btn: "احجز موعداً →",
      rdv_label: "جدولة المواعيد",
      rdv_title: "احجز",
      rdv_title2: "موعداً",
      rdv_sub: "اختر وقتاً متاحاً (الاثنين أو الأربعاء أو الجمعة) واستلم تأكيدك عبر البريد الإلكتروني.",
      bk_name: "الاسم الكامل",
      bk_name_ph: "اسمك الكامل",
      bk_email: "البريد الإلكتروني",
      bk_phone: "رقم الهاتف",
      bk_btn: "تأكيد الموعد",
      contact_label: "تواصل معنا",
      contact_title: "تحدث معنا عن",
      contact_title2: "مشروعك",
      contact_sub: "اتركْ لنا اسمك وبريدك الإلكتروني <b>ورقم هاتفك</b> وتفاصيل مشروعك. سنرد عليك خلال 24 ساعة.",
      contact_name_ph: "اسمك الكامل",
      contact_email_ph: "بريدك الإلكتروني",
      contact_phone_ph: "رقم هاتفك (مثال: +212...)",
      contact_msg_ph: "صف مشروعك...",
      contact_btn: "إرسال الرسالة",
      or_text: "أو",
      about_badge: "وكالة رقمية وإدارة عقارية",
      about_title: "من نحن؟",
      about_text: "نحن وكالة رقمية متخصصة في مرافقة المهنيين والشركات والمؤسسات لتجسيد رؤاهم. تأسست الوكالة على يد خبير شغوف بالمجال الرقمي والمالي، ونصنع تجارب رقمية فريدة تترك بصمة قوية من خلال خدمات تطوير مواقع الويب المخصصة، والتسويق الرقمي الاستراتيجي، والإدارة الاحترافية لوسائل التواصل الاجتماعي (Community Management)، والإنتاج السمعي البصري عالي الجودة (تصوير فوتوغرافي وفيديو).",
      founder_label: "كلمة المؤسس",
      founder_quote: "في Rihanio، نؤمن بأن كل مشروع فريد من نوعه ويستحق نهج التميز. من خلال الجمع بين خبرتي في هندسة التسيير وشغفي بالإبداع البصري والرقمي، أردت إنشاء وكالة قادرة على تقديم رؤية شاملة 360° للشركات. مهمتنا بسيطة: تحويل أفكاركم إلى نجاحات ملموسة وترك بصمة رقمية دائمة.",
      founder_role: "المؤسس والمدير العام للوكالة",
      about_cta: "احجز موعداً →",
      dir: "rtl"
    }
  };

  let currentLang = 'fr';

  function setLanguage(lang) {
    currentLang = lang;
    const t = translations[lang];

    // Update active button (desktop + mobile switchers)
    ['fr','en','ar'].forEach(l => {
      const desktopBtn = document.getElementById('lang-' + l);
      if (desktopBtn) desktopBtn.classList.toggle('active', l === lang);
      const mobileBtn = document.getElementById('mobile-lang-' + l);
      if (mobileBtn) mobileBtn.classList.toggle('active', l === lang);
    });

    // Set page direction
    document.documentElement.setAttribute('dir', t.dir);
    document.documentElement.setAttribute('lang', lang);

    // Translate all [data-i18n] elements
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (t[key] !== undefined) {
        el.innerHTML = t[key];
      }
    });

    // Translate placeholders [data-i18n-ph]
    document.querySelectorAll('[data-i18n-ph]').forEach(el => {
      const key = el.getAttribute('data-i18n-ph');
      if (t[key] !== undefined) {
        el.placeholder = t[key];
      }
    });

    // Nav RTL: direction is locked via CSS, no JS manipulation needed
    // The lang-switcher and nav-right have direction:ltr !important

    // Mémorise le choix pour que la page "Qui sommes-nous" s'ouvre dans la même langue
    localStorage.setItem('rihanio_lang', lang);
  }

  // Init on load : reprend la dernière langue choisie, sinon français par défaut
  setLanguage(localStorage.getItem('rihanio_lang') || 'fr');

  /* ------------------------------------------- */
  /* MENU MOBILE (hamburger)                      */
  /* ------------------------------------------- */
  function toggleMobileMenu() {
    document.getElementById('nav-burger').classList.toggle('open');
    document.getElementById('mobile-menu').classList.toggle('open');
    document.getElementById('mobile-menu-overlay').classList.toggle('open');
    document.body.classList.toggle('mobile-menu-active');
  }

  function closeMobileMenu() {
    document.getElementById('nav-burger').classList.remove('open');
    document.getElementById('mobile-menu').classList.remove('open');
    document.getElementById('mobile-menu-overlay').classList.remove('open');
    document.body.classList.remove('mobile-menu-active');
  }
