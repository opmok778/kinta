FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PORT=3000

WORKDIR /app

COPY backend ./backend
COPY public ./public
COPY server.py ./

EXPOSE 3000

CMD ["python", "server.py"]
