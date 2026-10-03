FROM ubuntu:24.04
RUN apt-get update && apt-get install -y \
    gcc nasm make qemu-system-x86 grub-pc-bin xorriso mtools python3 \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /src
COPY . /src
RUN make
CMD ["bash"]
