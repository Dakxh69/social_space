from fastapi_mail import FastMail, MessageSchema, ConnectionConfig

from app.core.config import settings

conf = ConnectionConfig(
    MAIL_USERNAME=settings.MAIL_USERNAME,
    MAIL_PASSWORD=settings.MAIL_PASSWORD,
    MAIL_FROM=settings.MAIL_FROM,
    MAIL_PORT=settings.MAIL_PORT,
    MAIL_SERVER=settings.MAIL_SERVER,
    MAIL_STARTTLS=True,
    MAIL_SSL_TLS=False,
    USE_CREDENTIALS=True
)


async def send_verification_email(
    email:str,
    name:str,
    verification_link:str
): 
    html = f"""
    <h2>Hello {name}</h2>

    <p>Please verify your email by clicking the button below.</p>

    <a
        href="{verification_link}"
        style="
            background:#2563eb;
            color:white;
            padding:12px 20px;
            text-decoration:none;
            border-radius:6px;
            display:inline-block;
        "
    >
        Verify Email
    </a>

    <p>If the button does not work:</p>

    <p>{verification_link}</p>
    """

    message = MessageSchema(
        subject="Verify Your Email",
        recipients=[email],
        body=html,
        subtype="html"
    )

    fm = FastMail(conf)

    await fm.send_message(message)