# socketio-node-cluster

Update: 05 JAN 2016: Work in progress.

Objective:
This project tries to act as a self configuring set of node-js processes that connect
to each other and behave like a clustered chat server. The chat backend will use socket-io
instead of xmpp for both internal as well as external communication.

The cluster is compromised of gears (a.k.a the compute unit in Redhat openshift enterprise).
Each gear runs a nodejs server which is essentially identical, and these gears connect
and communicate with each other. 

Clients can connect to these gears over socketio. Clients could be browsers/apps etc.
All communication between gears, between gears and clients is done using json format data.



TODO (updated 09 JAN 2016)

1. Get gears to start communicating with MASTER and each other                                      [Basic done]
2. Allow saving of configuration data in MASTER and easy distribution of config data among gears.
3. Gears must allow easy exchange of config data of clients, conn status etc.