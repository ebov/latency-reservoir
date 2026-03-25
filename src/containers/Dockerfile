# ============================
# Stage 1: Build Environment
# ============================
FROM nvidia/cuda:12.1.1-devel-ubuntu22.04 AS builder

# Install build tools and dependencies
RUN apt-get update && apt-get install -y \
    python3.10-venv \
    git \
    default-jdk \
    wget \
    cmake \
    build-essential \
    autoconf \
    automake \
    libtool \
    pkg-config \
    ant \
    subversion \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create Python virtual environment and install packages
RUN python3 -m venv /venv
ENV PATH="/venv/bin:$PATH"
RUN pip install --upgrade pip && \
    pip install \
        "click>=8.1.8,<9" \
        "numpy>=2.2.1,<3" \
        "biopython>=1.84,<2" \
        "mako>=1.3.10,<2"
# Build BEAST
ENV JAVA_TOOL_OPTIONS=-Dfile.encoding=UTF8
# apptainer won't have access to /root
ENV ROOT_HOME=/
# to make copying over easier in the end
RUN mkdir ${ROOT_HOME}/beast_builds/
# RUN mkdir -p ${ROOT_HOME}/libs

ENV COMMIT_ID=a5dbe6fdb6c58a68366dd7c5731f4f7332438e49
WORKDIR /beast_builds
RUN git clone --branch latentModel https://beast-dev@github.com/beast-dev/beast-mcmc.git && \
    cd beast-mcmc && \
    git reset --hard ${COMMIT_ID} && \
    ant linux

# Build BEAGLE
WORKDIR /
RUN wget https://github.com/beagle-dev/beagle-lib/archive/refs/tags/v4.0.1.tar.gz && \
    tar -xzf v4.0.1.tar.gz && \
    cd beagle-lib-4.0.1 && \
    mkdir build && cd build && \
    cmake -DBUILD_OPENCL=OFF -DCMAKE_INSTALL_PREFIX=/opt/beagle .. && \
    make install

# Install PAML
RUN git clone https://github.com/abacus-gene/paml.git \
    && cd paml \
    && git reset --hard v4.10.9 \
    && cd src \
    && make -f Makefile \
    && rm *.o

#iqtree
RUN wget https://github.com/iqtree/iqtree3/releases/download/v3.0.1/iqtree-3.0.1-Linux.tar.gz &&\
     tar -xzf iqtree-3.0.1-Linux.tar.gz


# Install Node.js using nvm (Node Version Manager)
ARG NODE_VERSION=22.18.0
RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
# set env
ENV NVM_DIR=/root/.nvm
# install node
RUN bash -c "source $NVM_DIR/nvm.sh && nvm install $NODE_VERSION"



# ============================
# Stage 2: gotree
# ============================
# gotree just downloaded from releases - TODO grab from dockerhub image
FROM golang:1.25 AS go

WORKDIR /go/src/app
RUN git clone --depth=1 --branch v0.5.0 https://github.com/evolbioinfo/gotree && \
    cd gotree && \
    go install -v ./

# ============================
# Stage 3: Runtime Environment
# ============================
FROM nvidia/cuda:12.1.1-runtime-ubuntu22.04


RUN apt-get update && \
    apt-get install -y default-jdk \
    coreutils \
    bc \
    && rm -rf /var/lib/apt/lists/*

#iqtree
COPY --from=builder iqtree-3.0.1-Linux/bin/ /bin

# COPY node
ARG NODE_VERSION=22.18.0
COPY --from=builder /root/.nvm/versions/node/v${NODE_VERSION} /opt/node/
ENV PATH="/opt/node/bin:$PATH"

# Copy Python virtual environment
COPY --from=builder /venv /venv
ENV PATH="/venv/bin:$PATH"

# # Copy BEAST binaries
COPY --from=builder /beast_builds/beast-mcmc/release/Linux/BEAST_X* /BEASTX/
ENV PATH="/BEASTX/bin:$PATH"

# Copy BEAGLE libraries
COPY --from=builder /opt/beagle/lib/ /lib
COPY --from=builder /opt/beagle/include/ /

# Copy PAML binaries
COPY --from=builder paml/src/baseml paml/src/basemlg paml/src/codeml paml/src/evolver paml/src/infinitesites paml/src/mcmctree paml/src/pamp  /bin/

# Gotree
COPY --from=go /go/bin/gotree /bin/gotree

# Set Java options
ENV JAVA_TOOL_OPTIONS=-Dfile.encoding=UTF8
ENV _JAVA_OPTIONS="-Xmx6g"
ENV LD_LIBRARY_PATH=/lib:$LD_LIBRARY_PATH