#include <stdlib.h>
#include <stdio.h>
#include <string.h>
#include "hash.h"
#include <iostream>
#include <memory>

#include <grpcpp/grpcpp.h>
#include <grpc/support/log.h>
#include "grpc.grpc.pb.h"

using grpc::Channel;
using grpc::ClientAsyncResponseReader;
using grpc::ClientContext;
using grpc::CompletionQueue;
using grpc::Status;
using proto::c2s;
using proto::Hash_struct;
using proto::time_id;

class GreeterClient {
 public:
  explicit GreeterClient(std::shared_ptr<Channel> channel): stub_(c2s::NewStub(channel)) {}

  // Assembles the client's payload, sends it and presents the response back
  // from the server.
  time_id client_upload(Hash_struct user) {
    // Data we are sending to the server.
    Hash_struct request;
    request = user;

    // Container for the data we expect from the server.
    static time_id reply;

    // Context for the client. It could be used to convey extra information to
    // the server and/or tweak certain RPC behaviors.
    ClientContext context;

    // The producer-consumer queue we use to communicate asynchronously with the
    // gRPC runtime.
    CompletionQueue cq;

    // Storage for the status of the RPC upon completion.
    Status status;

    // stub_->PrepareAsyncSayHello() creates an RPC object, returning
    // an instance to store in "call" but does not actually start the RPC
    // Because we are using the asynchronous API, we need to hold on to
    // the "call" instance in order to get updates on the ongoing RPC.
    std::unique_ptr<ClientAsyncResponseReader<time_id> > rpc(stub_->PrepareAsyncupload(&context, request, &cq));

    // StartCall initiates the RPC call
    rpc->StartCall();

    // Request that, upon completion of the RPC, "reply" be updated with the
    // server's response; "status" with the indication of whether the operation
    // was successful. Tag the request with the integer 1.
    rpc->Finish(&reply, &status, (void*)1);
    void* got_tag;
    bool ok = false;
    // Block until the next result is available in the completion queue "cq".
    // The return value of Next should always be checked. This return value
    // tells us whether there is any kind of event or the cq_ is shutting down.
    GPR_ASSERT(cq.Next(&got_tag, &ok));

    // Verify that the result from "cq" corresponds, by its tag, our previous
    // request.
    GPR_ASSERT(got_tag == (void*)1);
    // ... and that the request was completed successfully. Note that "ok"
    // corresponds solely to the request for updates introduced by Finish().
    GPR_ASSERT(ok);

    // Act upon the status of the actual RPC.
    if (!status.ok()) {
      reply.set_id(0);
      reply.set_sec(0);
      reply.set_usec(0);
      printf("RPC failed\n");
    }
    return reply;
  }

 private:
  // Out of the passed in Channel comes the stub, stored here, our view of the
  // server's exposed services.
  std::unique_ptr<c2s::Stub> stub_;
};

int main(int argc, char** argv) {
    if (argc != 3) {
      std::cerr << "Usage: " << argv[0] << " <server_ip> <server_port>" << std::endl;
      return 1;
    }
    char edge_ip[128];
    strcpy(edge_ip, argv[2]);
    for (int i = 1; i < 11; ++i){
        char filename[20];
        sprintf(filename, "password.txt");
        FILE *fp = fopen(filename, "r"); // need input
        fseek(fp, 0, SEEK_END);
        long len = ftell(fp);
        unsigned char *buf = (unsigned char *)malloc(len);
        fseek(fp, 0, SEEK_SET);
        fread(buf, len, sizeof(char), fp);
        fclose(fp);
        struct Hash out = sha256(buf);
        Hash_struct user;
        user.set_h0(out.h0);
        user.set_h1(out.h1);
        user.set_h2(out.h2);
        user.set_h3(out.h3);
        user.set_h4(out.h4);
        user.set_h5(out.h5);
        user.set_h6(out.h6);
        user.set_h7(out.h7);
        free(buf);
        // Instantiate the client. It requires a channel, out of which the actual RPCs
        // are created. This channel models a connection to an endpoint (in this case,
        // localhost at port 50051). We indicate that the channel isn't authenticated
        // (use of InsecureChannelCredentials()).
        GreeterClient greeter(grpc::CreateChannel(edge_ip, grpc::InsecureChannelCredentials()));
        time_id reply = greeter.client_upload(user);  // The actual RPC call!
    }
    return 0;
}