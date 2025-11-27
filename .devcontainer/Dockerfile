FROM ubuntu:24.04

# Install build dependencies for MicroPython RP2 (Raspberry Pi Pico)
RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    python3 \
    python3-pip \
    git \
    gcc-arm-none-eabi \
    libnewlib-arm-none-eabi \
    wget \
    unzip \
    && rm -rf /var/lib/apt/lists/*

# Use /workspaces to match Codespaces defaults
WORKDIR /workspaces

# Set default shell
SHELL ["/bin/bash", "-c"]

# Optionally install Python requirements (if needed for build scripts)
COPY requirements.txt /tmp/devcontainer-requirements.txt
RUN pip3 install -r /tmp/devcontainer-requirements.txt || true && rm -f /tmp/devcontainer-requirements.txt

# Display build instructions on container start
CMD ["bash"]
