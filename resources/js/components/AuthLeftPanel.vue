<template>
  <div class="auth-split__left">
    <!-- Decorative blobs -->
    <div class="auth-blob auth-blob--1"></div>
    <div class="auth-blob auth-blob--2"></div>
    <div class="auth-blob auth-blob--3"></div>

    <div class="auth-split__left-inner">
      <!-- Brand -->
      <div class="auth-split__brand">
        <div class="auth-split__brand-icon">🏠</div>
        <span>FamilyLocker</span>
      </div>

      <!-- Illustration -->
      <div class="auth-illustration">
        <svg viewBox="0 0 420 340" xmlns="http://www.w3.org/2000/svg" class="auth-illustration__svg">
          <!-- Sky glow -->
          <ellipse cx="210" cy="290" rx="190" ry="28" fill="rgba(255,255,255,0.06)" />

          <!-- Stars -->
          <circle cx="60" cy="40" r="2" fill="white" opacity="0.7"/>
          <circle cx="110" cy="20" r="1.5" fill="white" opacity="0.5"/>
          <circle cx="310" cy="30" r="2" fill="white" opacity="0.6"/>
          <circle cx="370" cy="55" r="1.5" fill="white" opacity="0.4"/>
          <circle cx="340" cy="15" r="1" fill="white" opacity="0.6"/>
          <circle cx="85" cy="65" r="1" fill="white" opacity="0.4"/>
          <circle cx="160" cy="18" r="1" fill="white" opacity="0.5"/>
          <circle cx="260" cy="12" r="1.5" fill="white" opacity="0.5"/>
          <circle cx="395" cy="80" r="1" fill="white" opacity="0.4"/>
          <circle cx="25" cy="90" r="1" fill="white" opacity="0.4"/>

          <!-- Moon -->
          <circle cx="360" cy="45" r="22" fill="rgba(255,255,255,0.15)" />
          <circle cx="369" cy="38" r="18" fill="rgba(72,52,212,0.7)" />

          <!-- Ground -->
          <rect x="30" y="272" width="360" height="14" rx="7" fill="rgba(255,255,255,0.12)" />

          <!-- Left tree -->
          <rect x="72" y="220" width="10" height="56" rx="4" fill="rgba(255,255,255,0.2)" />
          <ellipse cx="77" cy="208" rx="28" ry="32" fill="rgba(255,255,255,0.15)" />
          <ellipse cx="77" cy="194" rx="20" ry="24" fill="rgba(255,255,255,0.1)" />

          <!-- Right tree -->
          <rect x="340" y="228" width="10" height="48" rx="4" fill="rgba(255,255,255,0.2)" />
          <ellipse cx="345" cy="216" rx="24" ry="28" fill="rgba(255,255,255,0.15)" />
          <ellipse cx="345" cy="202" rx="17" ry="20" fill="rgba(255,255,255,0.1)" />

          <!-- Small bush left -->
          <ellipse cx="130" cy="265" rx="22" ry="14" fill="rgba(255,255,255,0.1)" />
          <!-- Small bush right -->
          <ellipse cx="292" cy="268" rx="18" ry="12" fill="rgba(255,255,255,0.1)" />

          <!-- House body -->
          <rect x="130" y="168" width="160" height="108" rx="6" fill="rgba(255,255,255,0.18)" />

          <!-- Roof -->
          <polygon points="115,172 210,95 305,172" fill="rgba(255,255,255,0.28)" />
          <!-- Roof ridge cap -->
          <polygon points="140,172 210,106 280,172" fill="rgba(255,255,255,0.12)" />

          <!-- Chimney -->
          <rect x="248" y="108" width="18" height="36" rx="3" fill="rgba(255,255,255,0.22)" />
          <!-- Smoke puffs -->
          <circle cx="257" cy="100" r="7" fill="rgba(255,255,255,0.12)" />
          <circle cx="262" cy="88" r="5" fill="rgba(255,255,255,0.08)" />
          <circle cx="256" cy="78" r="4" fill="rgba(255,255,255,0.06)" />

          <!-- Left window -->
          <rect x="148" y="192" width="42" height="36" rx="5" fill="rgba(255,220,100,0.35)" />
          <rect x="148" y="192" width="42" height="36" rx="5" fill="none" stroke="rgba(255,255,255,0.4)" stroke-width="2" />
          <line x1="169" y1="192" x2="169" y2="228" stroke="rgba(255,255,255,0.35)" stroke-width="1.5"/>
          <line x1="148" y1="210" x2="190" y2="210" stroke="rgba(255,255,255,0.35)" stroke-width="1.5"/>
          <rect x="150" y="194" width="38" height="32" rx="3" fill="rgba(255,220,80,0.18)" />

          <!-- Right window -->
          <rect x="230" y="192" width="42" height="36" rx="5" fill="rgba(255,220,100,0.35)" />
          <rect x="230" y="192" width="42" height="36" rx="5" fill="none" stroke="rgba(255,255,255,0.4)" stroke-width="2" />
          <line x1="251" y1="192" x2="251" y2="228" stroke="rgba(255,255,255,0.35)" stroke-width="1.5"/>
          <line x1="230" y1="210" x2="272" y2="210" stroke="rgba(255,255,255,0.35)" stroke-width="1.5"/>
          <rect x="232" y="194" width="38" height="32" rx="3" fill="rgba(255,220,80,0.18)" />

          <!-- Door -->
          <rect x="186" y="222" width="48" height="54" rx="6" fill="rgba(255,255,255,0.22)" />
          <rect x="186" y="222" width="48" height="54" rx="6" fill="none" stroke="rgba(255,255,255,0.4)" stroke-width="2" />
          <path d="M186,240 Q210,214 234,240" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.3)" stroke-width="1.5"/>
          <circle cx="228" cy="252" r="3.5" fill="rgba(255,220,80,0.8)" />

          <!-- Door step -->
          <rect x="178" y="274" width="64" height="8" rx="3" fill="rgba(255,255,255,0.2)" />

          <!-- Walkway -->
          <path d="M210,282 L185,286 L192,300 L228,300 L235,286 Z" fill="rgba(255,255,255,0.1)" />

          <!-- Floating shield icon -->
          <g transform="translate(20, 110)">
            <path d="M20,4 L36,10 L36,22 Q36,30 20,36 Q4,30 4,22 L4,10 Z" fill="rgba(255,255,255,0.2)" stroke="rgba(255,255,255,0.4)" stroke-width="1.5"/>
            <path d="M14,18 L18,23 L27,14" stroke="rgba(255,255,255,0.8)" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
          </g>

          <!-- Floating heart -->
          <g transform="translate(362, 120)">
            <path d="M20,28 Q2,18 2,10 Q2,2 10,2 Q15,2 20,8 Q25,2 30,2 Q38,2 38,10 Q38,18 20,28 Z" fill="rgba(255,255,255,0.2)" stroke="rgba(255,255,255,0.35)" stroke-width="1.5"/>
          </g>
        </svg>
      </div>

      <!-- Tagline -->
      <div class="auth-split__tagline">
        <h2>Keep your family<br>close &amp; secure.</h2>
        <p>Store documents, track expenses, share<br>memories — all in one safe place.</p>
      </div>

      <!-- Feature pills -->
      <div class="auth-split__features">
        <div class="auth-feature-pill"><i class="bi bi-shield-lock-fill"></i> Secure Vault</div>
        <div class="auth-feature-pill"><i class="bi bi-people-fill"></i> Family Sharing</div>
        <div class="auth-feature-pill"><i class="bi bi-images"></i> Photo Albums</div>
      </div>
    </div>
  </div>
</template>
