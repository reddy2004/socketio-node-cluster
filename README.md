# socketio-node-cluster

Update: 05 JAN 2016: Work in progress.

Objective:
This project tries to act as a self configuring set of node-js processes that connect
to each other and behave like a clustered chat server. The chat backend will use socket-io
instead of xmpp for both internal as well as external communication.

The cluster compromised of gears (a.k.a the compute unit in Redhat openshift enterprise).
Each gear runs a nodejs server which is essentially identical, and these gears connect
and communicate with each other. 
