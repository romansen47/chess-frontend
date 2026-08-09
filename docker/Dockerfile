# syntax=docker/dockerfile:1

ARG GIT_BRANCH=work

FROM node:22-bookworm AS frontend-build
ARG GIT_BRANCH
WORKDIR /build

RUN apt-get update && \
    apt-get install -y --no-install-recommends git ca-certificates && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

RUN git clone --branch ${GIT_BRANCH} --single-branch \
        https://github.com/romansen47/chess-frontend.git \
        /build/chess-frontend

WORKDIR /build/chess-frontend
RUN npm ci
RUN npm run build

FROM maven:3.9-eclipse-temurin-21 AS api-build
ARG GIT_BRANCH
WORKDIR /build

RUN apt-get update && \
    apt-get install -y --no-install-recommends git ca-certificates && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

RUN git clone https://github.com/romansen47/spring-annotation-context-initializer-template.git \
        /build/spring-annotation-context-initializer-template && \
    mvn -f /build/spring-annotation-context-initializer-template/pom.xml \
        clean install -DskipTests

RUN git clone --branch ${GIT_BRANCH} --single-branch \
        https://github.com/romansen47/chess.git \
        /build/chess && \
    mvn -f /build/chess/pom.xml clean install -DskipTests

RUN git clone --branch ${GIT_BRANCH} --single-branch \
        https://github.com/romansen47/chess-api.git \
        /build/chess-api && \
    mvn -f /build/chess-api/pom.xml clean package -DskipTests

FROM ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive
ENV PATH="/usr/games:${PATH}"

RUN apt-get update && \
    apt-get install -y --no-install-recommends software-properties-common ca-certificates && \
    add-apt-repository universe && \
    apt-get update && \
    apt-get install -y --no-install-recommends \
        apache2 \
        openjdk-21-jre-headless \
        openssl \
        stockfish \
        fairy-stockfish \
        fruit \
        toga2 && \
    a2enmod proxy proxy_http proxy_wstunnel rewrite ssl && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

RUN mkdir -p /etc/ssl/certs /etc/ssl/private && \
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout /etc/ssl/private/apache-selfsigned.key \
        -out /etc/ssl/certs/apache-selfsigned.crt \
        -subj "/CN=127.0.0.1" \
        -addext "subjectAltName=IP:127.0.0.1,DNS:localhost"

WORKDIR /app

COPY --from=api-build /build/chess-api/target/chess-api-0.0.1-SNAPSHOT.jar /app/chess-api.jar
COPY --from=frontend-build /build/chess-frontend/dist/ /var/www/html/

COPY docker/apache-config.conf /etc/apache2/sites-available/000-default.conf
COPY docker/apache-ssl.conf /etc/apache2/sites-available/default-ssl.conf
RUN a2ensite default-ssl.conf

EXPOSE 80 443

CMD service apache2 start && java -Xmx4g -Xms512m -jar /app/chess-api.jar
