FROM golang:1.13

LABEL "ntt.global.vendor"="NTT Limited" \
    version="0.1" \
    description="A simple demo Pokémon API in Go" \
    maintainer="alex.moore@global.ntt"

WORKDIR src
COPY ./src .

RUN go get -d -v
RUN go build -o /go/bin/main .

ENV DBSERVER=db \
    DATABASE=pokemon \
    COLLECTION=pokemon

EXPOSE 4242

CMD ["./main"]