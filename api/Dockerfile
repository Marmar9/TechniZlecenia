# Stage 1: Build
FROM rust:1.90-alpine AS builder

RUN apk update
RUN apk add mold clang20 gcc sqlx postgresql16 postgresql16-contrib postgresql16-client 

# run postgresql
RUN mkdir /postgres
RUN chown postgres:postgres /postgres
RUN su - postgres -c "initdb -D /postgres"
RUN mkdir /run/postgresql
RUN chown postgres:postgres /run/postgresql

# Build api
WORKDIR /app
COPY . ./
RUN chmod +x /app/api_build.sh
RUN /app/api_build.sh

FROM scratch AS runner

COPY --from=builder /app/target/x86_64-unknown-linux-musl/release/techni-zlecenia-api /techni-zlecenia-api

EXPOSE 8080

ENTRYPOINT ["/techni-zlecenia-api"]
