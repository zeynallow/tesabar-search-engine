"use client"

import React, { createContext, useContext, useState, useEffect, useCallback } from "react"
import { getLangForCountry } from "@/lib/countries"

export type Lang = "az" | "en"

export const translations = {
  az: {
    // Nav
    about: "Haqqında",
    api: "API",
    signIn: "Daxil ol",
    // Hero
    heroTagline: "Milyonlarla məhsul arasında axtarış",
    heroTitle1: "Hər şeyi tap.",
    heroTitle2: "Hər yerdə.",
    heroSubtitle: "Onlayn mağazalar arasında axtarış etməyin ən ağıllı yolu. Qiymətləri müqayisə et, endirimlər tap.",
    searchPlaceholder: "Milyonlarla məhsul arasında axtar...",
    searchPlaceholderSm: "Məhsul axtar...",
    searchBtn: "Axtar",
    // Stats
    storesIndexed: "İndekslənmiş Mağazalar",
    products: "Məhsullar",
    avgResponse: "Ort. Cavab",
    verifiedSellers: "Yoxlanılmış Satıcılar",
    searchingAcross: "Axtarış edilir",
    fromStores: "mağazadan məhsul",
    millionsOfProducts: "minlərlə mağazadan milyonlarla məhsul",
    // Sections
    trendingNow: "İndi Trend",
    fromLiveIndex: "Canlı indeksdən",
    popularStores: "Populyar Mağazalar",
    viewAll: "Hamısına bax",
    // Footer
    tagline: "E-ticarət axtarış mühərriki.",
    privacy: "Məxfilik",
    terms: "Şərtlər",
    contact: "Əlaqə",
    // Console - New Site
    backToSites: "Saytlara geri dön",
    addNewSite: "Yeni Sayt Əlavə Et",
    addNewSiteDesc: "Məhsulları indeksləməyə başlamaq üçün mağazanızı qeydiyyatdan keçirin",
    domain: "Domain",
    domainHint: "http:// və ya www olmadan daxil edin (məs. mystore.com)",
    siteName: "Sayt Adı",
    description: "Təsvir",
    country: "Ölkə",
    selectCountry: "Ölkə seçin",
    whatsNext: "Sonra nə baş verir?",
    step1: "Saytınız qeydiyyatdan keçiriləcək və doğrulama tokeni alacaqsınız",
    step2: "Saytınızın HTML-inə doğrulama meta teqini əlavə edin",
    step3: "Doğrulandıqdan sonra indeksləməyə başlamaq üçün sitemap URL-i əlavə edin",
    step4: "Məhsullarınız avtomatik olaraq taranacaq və indeksləndiriləcək",
    cancel: "Ləğv et",
    registerSite: "Saytı Qeydiyyatdan Keçir",
    // Console - Layout
    navDashboard: "İdarə Paneli",
    navSites: "Saytlar",
    navAds: "Reklamlar",
    navSettings: "Parametrlər",
    signOut: "Çıxış",
    // Console - Dashboard
    dashboard: "İdarə Paneli",
    manageIndexedStores: "İndekslənmiş mağazalarınızı və reklam kampaniyalarınızı idarə edin",
    addSite: "Sayt Əlavə Et",
    yourSites: "Saytlarınız",
    noSitesYet: "Hələ sayt yoxdur",
    addFirstSite: "Başlamaq üçün ilk saytınızı əlavə edin",
    statTotalSites: "Cəmi Saytlar",
    statPagesIndexed: "İndekslənmiş Səhifələr",
    statIssues: "Problemlər",
    statActiveCampaigns: "Aktiv Kampaniyalar",
    indexed: "indeksləndi",
    issues: "problem",
    // Console - Login
    welcomeBack: "Xoş gəldiniz",
    signInConsole: "Console hesabınıza daxil olun",
    emailAddress: "E-poçt adresi",
    password: "Şifrə",
    noAccount: "Hesabınız yoxdur?",
    createOne: "Yaradın",
    indexedStores: "İndekslənmiş Mağazalar",
    dailySearches: "Günlük Axtarışlar",
    // Console - Register
    createAccount: "Hesab yaradın",
    startIndexingToday: "Bu gün mağazanızı indeksləməyə başlayın",
    fullName: "Ad Soyad",
    company: "Şirkət",
    createAccountBtn: "Hesab Yarat",
    alreadyHaveAccount: "Artıq hesabınız var?",
    registerBenefit1: "Sitemap göndərin — qalanını biz edirik",
    registerBenefit2: "24 saat ərzində indeksləyin",
    registerBenefit3: "Hədəfli reklamlarla görünürlüyü artırın",
    registerBenefit4: "Tarama sağlamlığını və SEO problemlərini izləyin",
    alreadyTrusted: "Artıq 10.000+ mağaza tərəfindən istifadə olunur. Başlamaq pulsuzdur.",
    // Console - Settings
    settings: "Parametrlər",
    manageAccountDetails: "Hesab məlumatlarınızı idarə edin",
    accountProfile: "Hesab Profili",
    email: "E-poçt",
    emailVerified: "E-poçt Doğrulandı",
    verified: "Doğrulandı",
    notVerified: "Doğrulanmadı",
    changePassword: "Şifrəni Dəyiş",
    currentPassword: "Cari Şifrə",
    newPassword: "Yeni Şifrə",
    confirmNewPassword: "Yeni Şifrəni Təsdiqləyin",
    updatePassword: "Şifrəni Yenilə",
    passwordChanged: "Şifrə uğurla dəyişdirildi",
    couldNotLoadProfile: "Profil yüklənə bilmədi.",
    // Console - Ads
    adsAndCampaigns: "Reklamlar və Kampaniyalar",
    boostProducts: "Axtarış nəticələrində məhsullarınızı öndə göstərin",
    newCampaign: "Yeni Kampaniya",
    campaignName: "Kampaniya Adı",
    budget: "Büdcə",
    budgetType: "Büdcə Növü",
    budgetDaily: "Günlük",
    budgetTotal: "Ümumi",
    create: "Yarat",
    noCampaigns: "Bu sayt üçün hələ kampaniya yoxdur.",
    noCampaignsDesc: "Məhsullarınızı öndə göstərmək üçün kampaniya yaradın.",
    noRegisteredSites: "Hələ qeydiyyatdan keçirilmiş saytınız yoxdur.",
    addSiteFirst: "Kampaniya yaratmaq üçün əvvəlcə sayt əlavə edin.",
    // Console - Sites
    sites: "Saytlar",
    manageRegisteredStores: "Qeydiyyatdan keçirilmiş mağazalarınızı idarə edin",
    crawled: "Tarandı",
    lastCrawled: "Son tara",
    statusActive: "Aktiv",
    statusPending: "Gözləyir",
    statusSuspended: "Dayandırıldı",
    statusBanned: "Bloklandı",
    // Admin - Layout
    adminPanel: "Admin Panel",
    systemControl: "Sistem İdarəetməsi",
    signedInAs: "Daxil olmuşsunuz",
    allSites: "Bütün Saytlar",
    users: "İstifadəçilər",
    indexingJobs: "İndeksləmə İşləri",
    // Admin - Dashboard
    systemDashboard: "Sistem İdarə Paneli",
    platformOverview: "Tesabar platformunun real vaxt icmalı",
    totalSites: "Cəmi Saytlar",
    registeredUsers: "Qeydiyyatdan keçmiş İstifadəçilər",
    searchQueriesToday: "Bu günün axtarışları",
    jobsRunning: "İcra olunan işlər",
    activeCampaigns: "Aktiv Kampaniyalar",
    recentSites: "Son Saytlar",
    manageSites: "Saytları İdarə Et",
    manageUsers: "İstifadəçiləri İdarə Et",
    manageSitesDesc: "Bütün qeydiyyatdan keçirilmiş saytlara baxın və idarə edin",
    manageUsersDesc: "Sayt sahibləri və onların hesablarına baxın",
    indexingJobsDesc: "İndeksləmə pipeline-ı izləyin və idarə edin",
    active: "aktiv",
    queued: "gözləyir",
    // Admin - Login
    adminPanelTitle: "Admin Panel",
    restrictedAccess: "Məhdud giriş — yalnız icazəli şəxslər",
    adminEmail: "Admin E-poçtu",
    signInToAdmin: "Admin Panelinə Daxil Ol",
    restrictedNote: "Bu sahə Tesabar sistem administratorları üçün nəzərdə tutulmuşdur. İcazəsiz giriş cəhdləri qeydə alınır.",
    // Admin - Sites
    allSitesTitle: "Bütün Saytlar",
    manageAllStores: "Platformdakı bütün mağazaları idarə edin",
    searchByDomain: "Domain və ya ad ilə axtar...",
    owner: "Sahib",
    status: "Status",
    actions: "Əməliyyatlar",
    activate: "Aktivləşdir",
    suspend: "Dayandır",
    ban: "Blokla",
    noSitesFound: "Sayt tapılmadı",
    // Admin - Site Detail
    siteInfo: "Sayt Məlumatları",
    updateStatus: "Statusu Yenilə",
    saveStatus: "Statusu Saxla",
    triggerReindex: "Yenidən İndekslə",
    triggerReindexDesc: "Bu sayt üçün bütün səhifələrin tam yenidən taranmasını və indekslənməsini başladın.",
    addSitemapTitle: "Sitemap Əlavə Et",
    addSitemapDesc: "Bu sayta sitemap URL-i əlavə edin (domain validasiyasını keçir).",
    triggerFetchImmediately: "Dərhal yüklə",
    siteNotFound: "Sayt tapılmadı",
    pagesWithIssues: "Problemli Səhifələr",
    created: "Yaradılıb",
    pagesCrawled: "Taranan Səhifələr",
    pagesIndexed: "İndekslənmiş Səhifələr",
    // Admin - Users
    usersTitle: "İstifadəçilər",
    allUsersDesc: "Bütün qeydiyyatdan keçmiş sayt sahibləri və adminlər",
    createUser: "İstifadəçi Yarat",
    createNewUser: "Yeni İstifadəçi Yarat",
    grantAdmin: "Admin səlahiyyəti ver",
    searchByEmail: "E-poçt və ya ad ilə axtar...",
    role: "Rol",
    joined: "Qoşuldu",
    deactivate: "Deaktivləşdir",
    revokeAdmin: "Admini Geri Al",
    makeAdmin: "Admin Et",
    noUsersFound: "İstifadəçi tapılmadı",
    siteOwner: "Sayt Sahibi",
    inactive: "Deaktiv",
    // Admin - Indexing
    indexingJobsTitle: "İndeksləmə İşləri",
    monitorPipeline: "Tarama və indeksləmə pipeline-ı izləyin",
    running: "icra olunur",
    autoRefresh: "Avtomatik yenilə",
    refresh: "Yenilə",
    bulkIndexES: "Toplu ES İndeksləmə",
    updateAdBoosts: "Reklam Gücləndiricilərini Yenilə",
    noJobsFound: "İndeksləmə işi tapılmadı",
    urlsProcessed: "işlənmiş URL-lər",
    failed: "uğursuz",
    progress: "İrəliləyiş",
    started: "Başladı",
    completed: "Tamamlandı",
  },
  en: {
    // Nav
    about: "About",
    api: "API",
    signIn: "Sign In",
    // Hero
    heroTagline: "Searching across millions of products",
    heroTitle1: "Find anything.",
    heroTitle2: "Everywhere.",
    heroSubtitle: "The smartest way to search across every online store. Compare prices, find deals, and shop smarter.",
    searchPlaceholder: "Search millions of products across stores...",
    searchPlaceholderSm: "Search products...",
    searchBtn: "Search",
    // Stats
    storesIndexed: "Stores Indexed",
    products: "Products",
    avgResponse: "Avg. Response",
    verifiedSellers: "Verified Sellers",
    searchingAcross: "Searching across",
    fromStores: "products from",
    millionsOfProducts: "millions of products from thousands of stores",
    // Sections
    trendingNow: "Trending Now",
    fromLiveIndex: "From live index",
    popularStores: "Popular Stores",
    viewAll: "View all",
    // Footer
    tagline: "The e-commerce search engine.",
    privacy: "Privacy",
    terms: "Terms",
    contact: "Contact",
    // Console - New Site
    backToSites: "Back to Sites",
    addNewSite: "Add New Site",
    addNewSiteDesc: "Register your store to start indexing products",
    domain: "Domain",
    domainHint: "Enter your domain without http:// or www (e.g., mystore.com)",
    siteName: "Site Name",
    description: "Description",
    country: "Country",
    selectCountry: "Select a country",
    whatsNext: "What happens next?",
    step1: "Your site will be registered and you'll receive a verification token",
    step2: "Add the verification meta tag to your site's HTML",
    step3: "Once verified, add your sitemap URL to start indexing",
    step4: "We'll crawl and index your products automatically",
    cancel: "Cancel",
    registerSite: "Register Site",
    // Console - Layout
    navDashboard: "Dashboard",
    navSites: "Sites",
    navAds: "Ads",
    navSettings: "Settings",
    signOut: "Sign Out",
    // Console - Dashboard
    dashboard: "Dashboard",
    manageIndexedStores: "Manage your indexed stores and ad campaigns",
    addSite: "Add Site",
    yourSites: "Your Sites",
    noSitesYet: "No sites yet",
    addFirstSite: "Add your first site to get started",
    statTotalSites: "Total Sites",
    statPagesIndexed: "Pages Indexed",
    statIssues: "Issues",
    statActiveCampaigns: "Active Campaigns",
    indexed: "indexed",
    issues: "issues",
    // Console - Login
    welcomeBack: "Welcome back",
    signInConsole: "Sign in to your Console account",
    emailAddress: "Email address",
    password: "Password",
    noAccount: "Don't have an account?",
    createOne: "Create one",
    indexedStores: "Indexed Stores",
    dailySearches: "Daily Searches",
    // Console - Register
    createAccount: "Create your account",
    startIndexingToday: "Start indexing your store today",
    fullName: "Full Name",
    company: "Company",
    createAccountBtn: "Create Account",
    alreadyHaveAccount: "Already have an account?",
    registerBenefit1: "Submit your sitemap — we handle the rest",
    registerBenefit2: "Get indexed in under 24 hours",
    registerBenefit3: "Boost visibility with targeted ads",
    registerBenefit4: "Monitor crawl health & SEO issues",
    alreadyTrusted: "Already trusted by 10,000+ stores worldwide. Free to start.",
    // Console - Settings
    settings: "Settings",
    manageAccountDetails: "Manage your account details and security",
    accountProfile: "Account Profile",
    email: "Email",
    emailVerified: "Email Verified",
    verified: "Verified",
    notVerified: "Not verified",
    changePassword: "Change Password",
    currentPassword: "Current Password",
    newPassword: "New Password",
    confirmNewPassword: "Confirm New Password",
    updatePassword: "Update Password",
    passwordChanged: "Password changed successfully",
    couldNotLoadProfile: "Could not load profile.",
    // Console - Ads
    adsAndCampaigns: "Ads & Campaigns",
    boostProducts: "Boost your products in search results",
    newCampaign: "New Campaign",
    campaignName: "Campaign Name",
    budget: "Budget",
    budgetType: "Budget Type",
    budgetDaily: "Daily",
    budgetTotal: "Total",
    create: "Create",
    noCampaigns: "No campaigns yet for this site.",
    noCampaignsDesc: "Create a campaign to boost your products.",
    noRegisteredSites: "You have no registered sites yet.",
    addSiteFirst: "Add a site first to create campaigns.",
    // Console - Sites
    sites: "Sites",
    manageRegisteredStores: "Manage your registered stores",
    crawled: "Crawled",
    lastCrawled: "Last crawled",
    statusActive: "Active",
    statusPending: "Pending",
    statusSuspended: "Suspended",
    statusBanned: "Banned",
    // Admin - Layout
    adminPanel: "Admin Panel",
    systemControl: "System Control",
    signedInAs: "Signed in as",
    allSites: "All Sites",
    users: "Users",
    indexingJobs: "Indexing Jobs",
    // Admin - Dashboard
    systemDashboard: "System Dashboard",
    platformOverview: "Real-time overview of the Tesabar platform",
    totalSites: "Total Sites",
    registeredUsers: "Registered Users",
    searchQueriesToday: "Search Queries Today",
    jobsRunning: "Jobs Running",
    activeCampaigns: "Active Campaigns",
    recentSites: "Recent Sites",
    manageSites: "Manage Sites",
    manageUsers: "Manage Users",
    manageSitesDesc: "View and manage all registered sites",
    manageUsersDesc: "View site owners and their accounts",
    indexingJobsDesc: "Monitor and control indexing pipeline",
    active: "active",
    queued: "queued",
    // Admin - Login
    adminPanelTitle: "Admin Panel",
    restrictedAccess: "Restricted access — authorized personnel only",
    adminEmail: "Admin Email",
    signInToAdmin: "Sign In to Admin",
    restrictedNote: "This area is restricted to Tesabar system administrators. Unauthorized access attempts are logged.",
    // Admin - Sites
    allSitesTitle: "All Sites",
    manageAllStores: "Manage all registered stores on the platform",
    searchByDomain: "Search by domain or name…",
    owner: "Owner",
    status: "Status",
    actions: "Actions",
    activate: "Activate",
    suspend: "Suspend",
    ban: "Ban",
    noSitesFound: "No sites found",
    // Admin - Site Detail
    siteInfo: "Site Info",
    updateStatus: "Update Status",
    saveStatus: "Save Status",
    triggerReindex: "Trigger Reindex",
    triggerReindexDesc: "Queue a full re-crawl and re-index of all pages for this site.",
    addSitemapTitle: "Add Sitemap",
    addSitemapDesc: "Manually add a sitemap URL to this site (bypasses domain validation).",
    triggerFetchImmediately: "Trigger fetch immediately",
    siteNotFound: "Site not found",
    pagesWithIssues: "Pages with Issues",
    created: "Created",
    pagesCrawled: "Pages Crawled",
    pagesIndexed: "Pages Indexed",
    // Admin - Users
    usersTitle: "Users",
    allUsersDesc: "All registered site owners and admins",
    createUser: "Create User",
    createNewUser: "Create New User",
    grantAdmin: "Grant admin privileges",
    searchByEmail: "Search by email or name…",
    role: "Role",
    joined: "Joined",
    deactivate: "Deactivate",
    revokeAdmin: "Revoke Admin",
    makeAdmin: "Make Admin",
    noUsersFound: "No users found",
    siteOwner: "Site Owner",
    inactive: "Inactive",
    // Admin - Indexing
    indexingJobsTitle: "Indexing Jobs",
    monitorPipeline: "Monitor crawl and index pipeline",
    running: "running",
    autoRefresh: "Auto-refresh",
    refresh: "Refresh",
    bulkIndexES: "Bulk Index ES",
    updateAdBoosts: "Update Ad Boosts",
    noJobsFound: "No indexing jobs found",
    urlsProcessed: "URLs processed",
    failed: "failed",
    progress: "Progress",
    started: "Started",
    completed: "Completed",
  },
} satisfies Record<Lang, Record<string, string>>

export type TranslationKey = keyof typeof translations.en

interface LangContextValue {
  lang: Lang
  setLang: (l: Lang) => void
  t: (key: TranslationKey) => string
  country: string
  setCountry: (code: string) => void
}

const LangContext = createContext<LangContextValue>({
  lang: "en",
  setLang: () => {},
  t: (k) => k,
  country: "US",
  setCountry: () => {},
})

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en")
  const [country, setCountryState] = useState<string>("US")

  useEffect(() => {
    const savedLang = localStorage.getItem("app_lang") as Lang | null
    const savedCountry = localStorage.getItem("app_country")
    if (savedLang && (savedLang === "az" || savedLang === "en")) {
      setLangState(savedLang)
    }
    if (savedCountry) {
      setCountryState(savedCountry)
    }
  }, [])

  const setLang = useCallback((l: Lang) => {
    setLangState(l)
    localStorage.setItem("app_lang", l)
  }, [])

  const setCountry = useCallback((code: string) => {
    setCountryState(code)
    localStorage.setItem("app_country", code)
    const detectedLang = getLangForCountry(code)
    const savedLang = localStorage.getItem("app_lang")
    if (!savedLang) {
      setLangState(detectedLang)
      localStorage.setItem("app_lang", detectedLang)
    }
  }, [])

  const t = useCallback((key: TranslationKey): string => {
    return translations[lang][key] ?? translations.en[key] ?? key
  }, [lang])

  return (
    <LangContext.Provider value={{ lang, setLang, t, country, setCountry }}>
      {children}
    </LangContext.Provider>
  )
}

export function useLang() {
  return useContext(LangContext)
}

