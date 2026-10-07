import logging
import requests
from app.config import settings

logger = logging.getLogger("llm")

SYSTEM_PROMPT = (
    "You are JanMitra AI, a helpful assistant for Andhra Pradesh government welfare schemes. "
    "The current AP welfare catalogue includes: NTR Bharosa Pension, Annadata Sukhibhava, "
    "Aadabidda Nidhi, Talliki Vandanam, Deepam-2, Dr. NTR Vaidya Seva (Aarogyasri), "
    "Chandranna Pelli Kanuka, Free Bus Travel for Women and Nirudyoga Bruthi. "
    "Answer clearly in the user's language (English or Telugu). Be concise, accurate, and polite. "
    "Do not invent scheme details, amounts or deadlines. If unsure, say so and suggest "
    "checking the official portal or dialling 1902."
)


def _groq_complete(user_prompt: str) -> str | None:
    if not settings.GROQ_API_KEY or not settings.GROQ_API_KEY.strip():
        return None

    try:
        response = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {settings.GROQ_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": "llama-3.3-70b-versatile",
                "messages": [
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": user_prompt},
                ],
                "temperature": 0.4,
                "max_tokens": 1024,
            },
            timeout=15,
        )
        if response.status_code == 200:
            return response.json()["choices"][0]["message"]["content"]
        logger.warning("Groq API returned %s: %s", response.status_code, response.text[:200])
    except Exception as exc:
        logger.warning("Groq request failed: %s", exc)
    return None


def _ollama_complete(user_prompt: str) -> str | None:
    try:
        response = requests.post(
            f"{settings.OLLAMA_BASE_URL.rstrip('/')}/api/chat",
            json={
                "model": settings.OLLAMA_MODEL,
                "messages": [
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": user_prompt},
                ],
                "stream": False,
            },
            timeout=20,
        )
        if response.status_code == 200:
            return response.json().get("message", {}).get("content")
        logger.warning("Ollama returned %s", response.status_code)
    except Exception as exc:
        logger.warning("Ollama request failed: %s", exc)
    return None


def rule_based_response(user_prompt: str) -> tuple[str, list[dict]]:
    prompt_lower = user_prompt.lower()

    if any(k in prompt_lower for k in ("annadata", "sukhibhava", "farmer", "రైతు", "rythu")):
        return (
            "Annadata Sukhibhava gives ₹20,000 per farming family per year (₹14,000 central PM-KISAN "
            "+ ₹6,000 state share), paid in three instalments. Both land-owning and tenant farmers "
            "are covered. You need farmer registration, Aadhaar, land/tenancy proof, bank account "
            "and an income certificate.",
            [
                {"title": "Annadata Sukhibhava Portal", "url": "https://annadathasukhibhava.ap.gov.in"},
                {"title": "AP Agriculture Department", "url": "https://agriculture.ap.gov.in"},
            ],
        )

    if any(k in prompt_lower for k in ("pension", "bharosa", "elderly", "widow", "పించన్", "పెన్షన్")):
        return (
            "NTR Bharosa Pension gives ₹4,000 per month to senior citizens (60+) and widows, and "
            "₹6,000 or more to persons with disabilities. Family income must be within the prescribed "
            "limit, and you need Aadhaar, an income certificate, a Rice Card and a bank account. "
            "Apply at your village/ward Sachivalayam.",
            [{"title": "AP Social Security Pensions", "url": "https://sspensions.ap.gov.in"}],
        )

    if any(k in prompt_lower for k in ("aadabidda", "cheyutha", "women", "చేయూత", "మహిళ")):
        return (
            "Aadabidda Nidhi provides ₹1,500 per month (₹18,000/year) to women aged 18–59 from "
            "households with annual income up to ₹2.5 lakh. It succeeds the earlier YSR Cheyutha scheme.",
            [{"title": "Aadabidda Nidhi (Beneficiary Management)", "url": "https://bm-sgsw.ap.gov.in/BM/"}],
        )

    if any(k in prompt_lower for k in ("talliki", "vandanam", "amma", "vodi", "school", "mother", "అమ్మ")):
        return (
            "Talliki Vandanam gives ₹15,000 per school-going child (Class 1–12) per year, credited "
            "to the mother's account. Family annual income must not exceed ₹2.5 lakh.",
            [{"title": "Talliki Vandanam (Beneficiary Management)", "url": "https://bm-sgsw.ap.gov.in/BM/"}],
        )

    if any(k in prompt_lower for k in ("deepam", "lpg", "gas", "cylinder", "దీపం")):
        return (
            "Deepam-2 provides 3 free LPG cylinders per year to eligible BPL women to promote clean "
            "cooking fuel.",
            [{"title": "AP Civil Supplies", "url": "https://civilsupplies.ap.gov.in"}],
        )

    if any(k in prompt_lower for k in ("vaidya", "aarogya", "health", "insurance", "ఆరోగ్యశ్రీ")):
        return (
            "Dr. NTR Vaidya Seva (Aarogyasri) provides cashless treatment of up to ₹25 lakh per family "
            "per year at network hospitals for families with annual income up to ₹5 lakh.",
            [{"title": "Dr. NTR Vaidya Seva", "url": "https://drntrvaidyaseva.ap.gov.in"}],
        )

    if any(k in prompt_lower for k in ("pelli", "kanuka", "marriage", "పెళ్లి")):
        return (
            "Chandranna Pelli Kanuka provides one-time marriage assistance of ₹10,000 to ₹1,00,000 "
            "to brides from economically weaker households (family income up to ₹2 lakh).",
            [{"title": "SERP – Women & Social Welfare", "url": "https://serp.ap.gov.in"}],
        )

    if any(k in prompt_lower for k in ("bus", "travel", "apsrtc", "బస్")):
        return (
            "Women can travel free of cost in APSRTC ordinary and Palle Velugu bus services across "
            "the 26 districts of Andhra Pradesh.",
            [{"title": "APSRTC", "url": "https://apsrtconline.in"}],
        )

    if any(k in prompt_lower for k in ("nirudyoga", "unemploy", "bruthi", "నిరుద్యోగ")):
        return (
            "Nirudyoga Bruthi gives ₹1,000 per month to unemployed educated youth aged 22–35 (family "
            "income up to ₹2.5 lakh) while they seek employment.",
            [{"title": "AP Employment & Training (job-seeker registration)", "url": "https://employment.ap.gov.in"}],
        )

    if any(k in prompt_lower for k in ("eligib", "qualify", "అర్హ")):
        return (
            "Open your Profile, enter accurate details, then check Schemes. JanMitra runs each scheme's "
            "rules against your profile and shows pass/fail for every criterion.",
            [{"title": "AP Official Portal", "url": "https://www.ap.gov.in"}],
        )

    return (
        "I can help with current Andhra Pradesh welfare schemes such as NTR Bharosa Pension, "
        "Annadata Sukhibhava, Aadabidda Nidhi, Talliki Vandanam, Deepam-2, Dr. NTR Vaidya Seva, "
        "Chandranna Pelli Kanuka and Nirudyoga Bruthi. Ask about eligibility, documents or benefits — "
        "in English or Telugu. You can also dial 1902 for the AP helpline.",
        [{"title": "AP Official Portal", "url": "https://www.ap.gov.in"}],
    )


def generate_chat_response(user_prompt: str) -> tuple[str, list[dict], str]:
    """Returns (content, sources, engine_used)."""
    groq = _groq_complete(user_prompt)
    if groq:
        return groq, [{"title": "AP Government Portal", "url": "https://www.ap.gov.in"}], "groq"

    ollama = _ollama_complete(user_prompt)
    if ollama:
        return ollama, [{"title": "AP Government Portal", "url": "https://www.ap.gov.in"}], "ollama"

    content, sources = rule_based_response(user_prompt)
    return content, sources, "rules"
