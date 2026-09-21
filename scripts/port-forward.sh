#!/bin/bash
trap 'kill $(jobs -p)' EXIT

forward_loop() {
  local cmd="$1"
  while true; do
    $cmd
    sleep 1
  done
}

forward_loop "kubectl port-forward svc/argocd-server 8080:80 -n argocd --address 0.0.0.0" &
forward_loop "kubectl port-forward svc/frontend 3000:3000 -n health-insurance --address 0.0.0.0" &
forward_loop "kubectl port-forward svc/gateway 3001:3001 -n health-insurance --address 0.0.0.0" &
forward_loop "kubectl port-forward svc/kube-prometheus-stack-grafana 3007:80 -n monitoring --address 0.0.0.0" &

wait
