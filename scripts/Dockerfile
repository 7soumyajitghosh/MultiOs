FROM ubuntu:24.04
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y \
    gcc nasm make qemu-system-x86 grub-pc-bin xorriso mtools python3 git \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /work
