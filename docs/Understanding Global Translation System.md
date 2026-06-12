✅ Understanding Global Translation System
IMS Translation Architecture:
1.	Global useTranslation() hook - Returns { t, language, isRTL, dir }
2.	Centralized translation keys - Dot-notation like "common.save", "organization.projectForm.title"
3.	Function-based access - t("key.path", "fallback")
4.	Language stored in localStorage - ims_language key
5.	Document direction set globally - document.documentElement.dir

