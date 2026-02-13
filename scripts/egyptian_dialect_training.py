"""
Egyptian Arabic Dialect Processing Script
المكتبات المصرية لفهم اللهجة المصرية

This script demonstrates Egyptian dialect processing capabilities using:
- CAMeL Tools for Arabic NLP
- PyArabic for Arabic text processing
- Custom Egyptian dialect dictionaries
"""

# المكتبات الأساسية للغة العربية
EGYPTIAN_DIALECT_RESOURCES = {
    "corpora": [
        "MADAR Arabic Dialect Corpus",
        "OpenSLR MADAR Arabic Dialect Dataset",
        "Arabic Gigaword",
        "OSCAR Arabic",
        "OpenSubtitles Arabic Dataset",
        "Egyptian Arabic Twitter Dataset",
        "Egyptian Arabic Wikipedia Dump",
        "QALB Dataset",
        "ArabiDial Dataset",
        "Egyptian Arabic Speech Corpus"
    ],
    "tools": [
        "CAMeL Tools - Arabic NLP toolkit",
        "PyArabic - Arabic text processing",
        "Qalsadi - Arabic morphological analyzer",
        "Farasa - Arabic text segmentation",
        "AraBERT - Arabic BERT models"
    ]
}

# قاموس اللهجة المصرية الشائعة
EGYPTIAN_SLANG = {
    # التحيات والمجاملات
    "ازيك": "how are you",
    "اخبارك": "what's up",
    "عامل ايه": "how are you doing",
    "تمام": "fine/okay",
    "كويس": "good",
    "ماشي": "going well",
    
    # الكلمات اليومية
    "عاوز": "want",
    "عايز": "want",
    "نفسي": "I wish",
    "ممكن": "can/possible",
    "علشان": "because/for",
    "عشان": "because/for",
    "لو سمحت": "please",
    "من فضلك": "please",
    
    # التعبيرات العامية
    "يا سلام": "wow",
    "والله": "I swear",
    "معلش": "sorry/excuse me",
    "خلاص": "enough/okay",
    "يلا": "let's go/come on",
    "هو": "is it",
    "ايه": "what",
    "فين": "where",
    "امتى": "when",
    "ازاي": "how",
    "ليه": "why",
    
    # الأفعال الشائعة
    "اعمل": "make/do",
    "روح": "go",
    "تعال": "come",
    "قول": "say",
    "اسمع": "listen",
    "شوف": "see/look",
    "خد": "take",
    "هات": "give",
    
    # الصفات
    "جميل": "beautiful",
    "حلو": "nice/sweet",
    "كبير": "big",
    "صغير": "small",
    "كتير": "a lot",
    "شوية": "a little"
}

# نماذج الجمل المصرية
EGYPTIAN_SENTENCE_PATTERNS = {
    "questions": [
        "انت عامل ايه؟",
        "ايه اخبارك؟",
        "فين راح؟",
        "امتى هتيجي؟",
        "ازاي اروح هناك؟"
    ],
    "requests": [
        "ممكن تساعدني؟",
        "عاوز اعرف...",
        "قوللي...",
        "اشرحلي...",
        "ساعدني في..."
    ],
    "statements": [
        "انا عاوز...",
        "نفسي...",
        "لازم...",
        "المفروض...",
        "ممكن..."
    ]
}

def process_egyptian_text(text: str) -> dict:
    """
    معالجة النص المصري وتحليله
    Process Egyptian Arabic text and analyze it
    """
    result = {
        "original": text,
        "detected_slang": [],
        "sentiment": "neutral",
        "intent": "unknown"
    }
    
    # البحث عن الكلمات العامية
    text_lower = text.lower()
    for slang, translation in EGYPTIAN_SLANG.items():
        if slang in text_lower:
            result["detected_slang"].append({
                "word": slang,
                "translation": translation
            })
    
    # تحليل المشاعر البسيط
    positive_words = ["حلو", "جميل", "كويس", "تمام", "رائع", "ممتاز"]
    negative_words = ["وحش", "مش كويس", "سيء", "مش حلو"]
    
    for word in positive_words:
        if word in text_lower:
            result["sentiment"] = "positive"
            break
    
    for word in negative_words:
        if word in text_lower:
            result["sentiment"] = "negative"
            break
    
    # تحديد النية
    if any(q in text_lower for q in ["ايه", "فين", "امتى", "ازاي", "ليه"]):
        result["intent"] = "question"
    elif any(r in text_lower for r in ["عاوز", "ممكن", "قوللي", "ساعدني"]):
        result["intent"] = "request"
    else:
        result["intent"] = "statement"
    
    return result

# مثال على الاستخدام
if __name__ == "__main__":
    test_texts = [
        "ازيك يا صاحبي؟ عامل ايه؟",
        "عاوز اعرف ازاي اروح القاهرة",
        "ممكن تساعدني في المشروع ده؟",
        "الموضوع ده حلو اوي والله"
    ]
    
    print("Egyptian Dialect Processing Examples:\n")
    for text in test_texts:
        result = process_egyptian_text(text)
        print(f"النص: {result['original']}")
        print(f"المشاعر: {result['sentiment']}")
        print(f"النية: {result['intent']}")
        print(f"الكلمات العامية: {len(result['detected_slang'])} كلمة")
        print("---")
