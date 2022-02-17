#!/bin/bash
#
# Copyright (c) 2022 Red Hat, Inc.
# This program and the accompanying materials are made
# available under the terms of the Eclipse Public License 2.0
# which is available at https://www.eclipse.org/legal/epl-2.0/
#
# SPDX-License-Identifier: EPL-2.0
#

mkdir -p che-logs/workspace-logs
PODS=$(kubectl get pod --namespace=eclipse-che | awk 'NR>1 {print $1}')
for pod in $PODS ; do
  kubectl logs --namespace=eclipse-che "${pod}" --namespace=eclipse-che > che-logs/"${pod}".pod.log || true;
done
WORKSPACE_NAMESPACE_NAME=admin-che
WS_POD=$(kubectl get pod --namespace=$WORKSPACE_NAMESPACE_NAME | grep ".workspace-" | awk '{print $1}')
for c in $(kubectl get pod --namespace=$WORKSPACE_NAMESPACE_NAME "${WS_POD}" -o jsonpath="{.spec.containers[*].name}") ; do
  CONTAINER_LOGS_DIR=che-logs/workspace-logs/"${c}"
  mkdir "${CONTAINER_LOGS_DIR}"
  kubectl logs "${WS_POD}" "${c}" --namespace=$WORKSPACE_NAMESPACE_NAME > "${CONTAINER_LOGS_DIR}.container.log" || true;
  kubectl cp "${WORKSPACE_NAMESPACE_NAME}/${WS_POD}:che-logs/workspace-logs" "${CONTAINER_LOGS_DIR}" -c "${c}" || true;
done
