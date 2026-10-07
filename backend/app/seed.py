"""Seed the JanMitra AI database with the current Andhra Pradesh welfare catalogue.

Dataset reflects the schemes active under the Government of Andhra Pradesh after the
2024 leadership transition (NTR Bharosa, Annadata Sukhibhava, Aadabidda Nidhi, etc.),
replacing the earlier YSR-era programme names. Amounts and criteria are the values
published on the respective departmental portals and are indicative for a demo.

Bump ``SEED_VERSION`` whenever the catalogue changes so startup refreshes the data.
"""

from app.database import engine, Base, SessionLocal
from app.models import (
    Department,
    Category,
    Document,
    Scheme,
    EligibilityRule,
    SeedMeta,
    scheme_documents,
)
import uuid

# Changing this value forces a full re-seed on next startup.
SEED_VERSION = "2026.10.07-ap-official-links"

# Scheme code -> (category code, department code) mapping documented below for clarity.

def _add(db, model, **kwargs):
    obj = model(id=str(uuid.uuid4()), **kwargs)
    db.add(obj)
    return obj


def seed_database():
    print("Initializing database tables...")
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        marker = db.query(SeedMeta).filter(SeedMeta.key == "seed_version").first()
        if marker and marker.value == SEED_VERSION:
            print("Database already at current seed version. Skipping.")
            return

        print(f"Refreshing dataset to seed version {SEED_VERSION}...")

        # Wipe the previous catalogue (association rows first to respect FKs).
        db.query(scheme_documents).delete()
        db.query(EligibilityRule).delete()
        db.query(Scheme).delete()
        db.query(Document).delete()
        db.query(Category).delete()
        db.query(Department).delete()
        # The version marker itself must go too, otherwise bumping SEED_VERSION
        # violates the UNIQUE constraint on seed_meta.key and startup aborts.
        db.query(SeedMeta).delete()
        db.flush()

        # ---------------------------------------------------------------- departments
        agri = _add(db, Department,
            name="Department of Agriculture, Andhra Pradesh",
            code="AGRI_AP",
            description="Farmer welfare, input support and agricultural extension services.",
            website="https://agriculture.ap.gov.in")
        ssp = _add(db, Department,
            name="Department of Social Welfare / Pensions",
            code="SSP_AP",
            description="Pensions and social security for the elderly, widows, disabled and transgender persons.",
            website="https://sspensions.ap.gov.in")
        serp = _add(db, Department,
            name="Society for Elimination of Rural Poverty (SERP)",
            code="SERP_AP",
            description="Rural livelihoods and women's empowerment programmes.",
            website="https://serp.ap.gov.in")
        health = _add(db, Department,
            name="Dr. NTR Vaidya Seva Trust",
            code="HEALTH_AP",
            description="Public health and cashless medical insurance for BPL families.",
            website="https://drntrvaidyaseva.ap.gov.in")
        edu = _add(db, Department,
            name="Department of School Education, Andhra Pradesh",
            code="EDU_AP",
            description="School education, student welfare and mother-focused education support.",
            website="https://cse.ap.gov.in")
        civil = _add(db, Department,
            name="Department of Consumer Affairs, Food & Civil Supplies",
            code="CIVIL_AP",
            description="PDS, Deepam LPG support and food security programmes.",
            website="https://civilsupplies.ap.gov.in")
        youth = _add(db, Department,
            name="Department of Youth Services & Sports",
            code="YOUTH_AP",
            description="Employment, skilling and youth welfare programmes.",
            website="https://ap.gov.in")
        db.flush()

        # --------------------------------------------------------------- categories
        cat_agri = _add(db, Category, name="Agriculture & Farmers", code="AGRI",
            description="Income support, subsidies and welfare for farmers and tenant farmers.")
        cat_pension = _add(db, Category, name="Social Security & Pensions", code="PENSION",
            description="Monthly pensions for senior citizens, widows, persons with disabilities and transgender persons.")
        cat_women = _add(db, Category, name="Women & Financial Empowerment", code="WOMEN",
            description="Direct financial assistance and self-reliance programmes for women.")
        cat_edu = _add(db, Category, name="Education & Students", code="EDU",
            description="Financial aid for mothers and students to keep children in school and college.")
        cat_health = _add(db, Category, name="Healthcare & Insurance", code="HEALTH",
            description="Cashless medical treatment and universal health coverage.")
        cat_food = _add(db, Category, name="Food & Nutrition", code="FOOD",
            description="Affordable/nutritional support such as LPG subsidy and subsidised meals.")
        cat_employ = _add(db, Category, name="Employment & Livelihoods", code="EMPLOY",
            description="Unemployment support and livelihood assistance for educated youth.")
        db.flush()

        # --------------------------------------------------------------- documents
        def doc(name, code, description):
            return _add(db, Document, name=name, code=code, description=description)

        d_aadhaar = doc("Aadhaar Card", "AADHAAR", "Primary unique identity document of the beneficiary.")
        d_income = doc("Income Certificate", "INCOME_CERT", "MeeSeva-issued family annual income certificate (valid for the current year).")
        d_caste = doc("Caste Certificate", "CASTE_CERT", "Community / caste certification issued by the revenue authority.")
        d_land = doc("Land Pattadar Passbook", "LAND_PASSBOOK", "Proof of agricultural land ownership or tenancy.")
        d_rice = doc("Rice Card (White Ration Card)", "RATION_CARD", "Household entitlement card used to establish BPL / resident status.")
        d_bank = doc("Bank Account (Aadhaar-linked)", "BANK_ACCOUNT", "Savings account linked to Aadhaar for Direct Benefit Transfer.")
        d_disability = doc("Disability Certificate (UDID)", "DISABILITY_CERT", "UDID / SADAREM disability certificate with disability percentage.")
        d_marriage = doc("Marriage Certificate", "MARRIAGE_CERT", "Registered marriage certificate from the registrar.")
        d_education = doc("Educational Qualification Certificate", "EDU_CERT", "Degree / diploma / SSC certificate proving educational qualification.")
        d_nativity = doc("Nativity / Residence Certificate", "NATIVITY", "Proof of permanent residence in Andhra Pradesh.")
        db.flush()

        # --------------------------------------------------------------- schemes
        def add_scheme(*, name, code, description, benefits, category, department,
                       website, helpline, documents, source, rules):
            scheme = _add(db, Scheme,
                name=name, code=code, description=description,
                benefits_summary=benefits,
                category_id=category.id, department_id=department.id,
                official_website=website, helpline=helpline,
                district_availability=["All"], pdf_source_url=source)
            scheme.documents.extend(documents)
            db.add(scheme)
            db.flush()
            for field_name, operator, value, message in rules:
                db.add(EligibilityRule(
                    id=str(uuid.uuid4()),
                    scheme_id=scheme.id,
                    field_name=field_name,
                    operator=operator,
                    rule_value=value,
                    error_message=message,
                ))
            return scheme

        # 1. Annadata Sukhibhava -------------------------------------------------
        add_scheme(
            name="Annadata Sukhibhava",
            code="ANNADATA_SUKHIBHAVA",
            description=("Income support programme for farming households in Andhra Pradesh, "
                         "the successor to YSR Rythu Bharosa. Both land-owning and tenant "
                         "farmers are covered."),
            benefits=("₹20,000 per farming family per year (₹14,000 central PM-KISAN + ₹6,000 "
                      "state share) released in three instalments."),
            category=cat_agri, department=agri,
            website="https://annadathasukhibhava.ap.gov.in",
            helpline="1902",
            documents=[d_aadhaar, d_land, d_bank, d_income],
            source="https://agriculture.ap.gov.in",
            rules=[
                ("is_farmer", "BOOLEAN", "True",
                 "Must be a registered farmer / tenant farmer cultivating land in Andhra Pradesh."),
            ],
        )

        # 2. NTR Bharosa Pension — Old Age --------------------------------------
        add_scheme(
            name="NTR Bharosa Pension (Old Age)",
            code="NTR_BHAROSA_OLD_AGE",
            description=("Monthly social security pension for senior citizens, replacing YSR "
                         "Pension Kanuka. Disbursed on the first working day of every month."),
            benefits="₹4,000 per month credited directly to the beneficiary's bank account.",
            category=cat_pension, department=ssp,
            website="https://sspensions.ap.gov.in",
            helpline="1902",
            documents=[d_aadhaar, d_income, d_rice, d_bank],
            source="https://sspensions.ap.gov.in",
            rules=[
                ("age", ">=", "60", "Applicant must be 60 years of age or older."),
                ("annual_income", "<=", "120000",
                 "Family income must not exceed ₹1,20,000 per year (approx. ₹10,000/month)."),
            ],
        )

        # 3. NTR Bharosa Pension — Disability -----------------------------------
        add_scheme(
            name="NTR Bharosa Pension (Disability)",
            code="NTR_BHAROSA_DISABILITY",
            description=("Enhanced monthly pension for persons with disabilities holding a valid "
                         "UDID / SADAREM certificate. Severe and multi-disability categories "
                         "receive higher slabs."),
            benefits=("₹6,000 per month for persons with disability; up to ₹10,000–₹15,000 for "
                      "fully/multi-disability and leprosy-cured categories."),
            category=cat_pension, department=ssp,
            website="https://sspensions.ap.gov.in",
            helpline="1902",
            documents=[d_aadhaar, d_disability, d_income, d_bank],
            source="https://sspensions.ap.gov.in",
            rules=[
                ("is_disabled", "BOOLEAN", "True",
                 "Applicant must hold a valid disability certificate (UDID/SADAREM)."),
                ("annual_income", "<=", "120000",
                 "Family income must not exceed ₹1,20,000 per year."),
            ],
        )

        # 4. Aadabidda Nidhi ----------------------------------------------------
        add_scheme(
            name="Aadabidda Nidhi",
            code="AADABIDDA_NIDHI",
            description=("Monthly financial assistance for women from economically weaker "
                         "households, the successor to YSR Cheyutha."),
            benefits="₹1,500 per month (₹18,000 per year) transferred via DBT.",
            category=cat_women, department=serp,
            website="https://bm-sgsw.ap.gov.in/BM/",
            helpline="1902",
            documents=[d_aadhaar, d_rice, d_income, d_bank],
            source="https://serp.ap.gov.in",
            rules=[
                ("gender", "=", "Female", "Beneficiary must be a woman."),
                ("age", ">=", "18", "Minimum age is 18 years."),
                ("age", "<=", "59", "Maximum age is 59 years."),
                ("annual_income", "<=", "250000", "Family annual income must not exceed ₹2.5 lakh."),
            ],
        )

        # 5. Talliki Vandanam ---------------------------------------------------
        add_scheme(
            name="Talliki Vandanam",
            code="TALLIKI_VANDANAM",
            description=("Assistance to mothers/guardians for each school-going child from Class "
                         "1 to 12, successor to Jagananna Amma Vodi. Paid in two instalments."),
            benefits="₹15,000 per school-going child per year credited to the mother's account.",
            category=cat_edu, department=edu,
            website="https://bm-sgsw.ap.gov.in/BM/",
            helpline="1902",
            documents=[d_aadhaar, d_income, d_rice, d_bank],
            source="https://cse.ap.gov.in",
            rules=[
                ("gender", "=", "Female", "Assistance is credited to the mother/guardian."),
                ("annual_income", "<=", "250000",
                 "Family annual income must not exceed ₹2.5 lakh."),
            ],
        )

        # 6. Deepam-2 -----------------------------------------------------------
        add_scheme(
            name="Deepam-2 LPG Scheme",
            code="DEEPAM_2",
            description=("Free LPG cylinder support for eligible BPL women to promote clean "
                         "cooking fuel and reduce household expenditure."),
            benefits="3 free LPG cylinders per year for eligible households.",
            category=cat_food, department=civil,
            website="https://civilsupplies.ap.gov.in",
            helpline="1902",
            documents=[d_aadhaar, d_rice],
            source="https://civilsupplies.ap.gov.in",
            rules=[
                ("gender", "=", "Female", "Scheme is restricted to women beneficiaries."),
                ("annual_income", "<=", "150000",
                 "Family income must indicate BPL / economically weaker status."),
            ],
        )

        # 7. Dr. NTR Vaidya Seva ------------------------------------------------
        add_scheme(
            name="Dr. NTR Vaidya Seva (Aarogyasri)",
            code="NTR_VAIDYA_SEVA",
            description=("Universal health insurance providing free cashless treatment for listed "
                         "procedures at network hospitals across Andhra Pradesh."),
            benefits="Cashless inpatient treatment of up to ₹25 lakh per family per year.",
            category=cat_health, department=health,
            website="https://drntrvaidyaseva.ap.gov.in",
            helpline="104",
            documents=[d_aadhaar, d_rice],
            source="https://drntrvaidyaseva.ap.gov.in",
            rules=[
                ("annual_income", "<=", "500000",
                 "Family annual income must not exceed ₹5 lakh."),
            ],
        )

        # 8. Chandranna Pelli Kanuka -------------------------------------------
        add_scheme(
            name="Chandranna Pelli Kanuka",
            code="CHANDRANNA_PELLI",
            description=("Marriage assistance to brides from economically weaker households. "
                         "Assistance is graded by community and family income."),
            benefits=("One-time marriage gift of ₹10,000 to ₹1,00,000 based on community "
                      "category, credited to the bride's bank account."),
            category=cat_women, department=serp,
            website="https://ap.gov.in",
            helpline="1902",
            documents=[d_aadhaar, d_income, d_caste, d_marriage, d_bank],
            source="https://tirupati.ap.gov.in/social-welfare/",
            rules=[
                ("gender", "=", "Female", "Assistance is provided to the bride."),
                ("age", ">=", "18", "Bride must be at least 18 years of age."),
                ("annual_income", "<=", "200000",
                 "Family annual income must not exceed ₹2 lakh."),
            ],
        )

        # 9. Free Bus Travel for Women -----------------------------------------
        add_scheme(
            name="Free Bus Travel for Women (APSRTC)",
            code="FREE_BUS_WOMEN",
            description=("Zero-fare travel for women in Palle Velugu and ordinary APSRTC services, "
                         "introduced to improve women's mobility and workforce participation."),
            benefits="Free bus travel for women in ordinary and Palle Velugu services.",
            category=cat_women, department=serp,
            website="https://apsrtconline.in",
            helpline="1902",
            documents=[d_aadhaar],
            source="https://apsrtconline.in",
            rules=[
                ("gender", "=", "Female", "Zero-fare travel is offered to women."),
                ("district", "IN", '["Alluri Sitharama Raju", "Anakapalli", "Ananthapuramu", "Annamayya", "Bapatla", "Chittoor", "East Godavari", "Eluru", "Guntur", "Kakinada", "Konaseema", "Krishna", "Kurnool", "Nandyal", "NTR", "Palnadu", "Parvathipuram Manyam", "Prakasam", "Sri Potti Sriramulu Nellore", "Sri Sathya Sai", "Srikakulam", "Tirupati", "Visakhapatnam", "Vizianagaram", "West Godavari", "YSR Kadapa"]',
                 "Must reside in one of the 26 districts of Andhra Pradesh."),
            ],
        )

        # 10. Nirudyoga Bruthi --------------------------------------------------
        add_scheme(
            name="Nirudyoga Bruthi (Unemployment Allowance)",
            code="NIRUDYOGA_BRUTHI",
            description=("Monthly unemployment allowance for educated job-seeking youth of "
                         "Andhra Pradesh to support them while they seek employment."),
            benefits="₹1,000 per month for eligible unemployed graduates for up to one year.",
            category=cat_employ, department=youth,
            website="https://employment.ap.gov.in",
            helpline="1902",
            documents=[d_aadhaar, d_education, d_income, d_bank],
            source="https://employment.ap.gov.in",
            rules=[
                ("age", ">=", "22", "Minimum age is 22 years."),
                ("age", "<=", "35", "Maximum age is 35 years."),
                ("occupation", "=", "Job Seeker", "Applicant must be registered as an active job seeker."),
                ("annual_income", "<=", "250000", "Family annual income must not exceed ₹2.5 lakh."),
            ],
        )

        db.add(SeedMeta(key="seed_version", value=SEED_VERSION))
        db.commit()
        print("Database seeded with the current AP welfare catalogue (10 schemes).")

    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise e
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
