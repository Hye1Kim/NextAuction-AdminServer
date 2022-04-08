#! /bin/sh

sudo docker build --tag khw0114/auction:$1 .
sudo docker push khw0114/auction:$1
br2k spray -r 5 -i khw0114/auction:$1 -a ./specific-document-example/add-service-example.yaml
kubectl get pods
