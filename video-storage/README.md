README.md

# test storage en mode local

```
docker build -t video-storage --file Dockerfile .
docker run -p 4000:4000 -e PORT=4000 video-storage
docker run -p 4001:4001 -e PORT=4001 -e VIDEO_STORAGE_PORT=4000 -e VIDEO_STORAGE_HOST='host.docker.internal'  video-storage
```

http://localhost:4000/video?path=SampleVideo_1280x720_1mb.mp4

http://localhost:4001/video?path=SampleVideo_1280x720_1mb.mp4

Pour tester un appel entre deux microservices
http://localhost:4001/gateway?path=SampleVideo_1280x720_1mb.mp4


# Portainer test
```
docker build -t video-storage --file Dockerfile .

docker save video-storage -o video-storage.tar
```

Voir les vidéos:
portainer-1: https://youtu.be/L0ak_Jsi3W8
portainer-2: https://youtu.be/VSxIHf0ZuF0

