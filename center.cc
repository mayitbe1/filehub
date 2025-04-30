#include <stdio.h>
#include <string.h>
#include "hash.h"

#include <memory>
#include <iostream>
#include <string>
#include <thread>

#include <grpcpp/grpcpp.h>
#include <grpc/support/log.h>
#include "grpc.grpc.pb.h"

#define DEBUG 0

using grpc::Server;
using grpc::ServerAsyncResponseWriter;
using grpc::ServerBuilder;
using grpc::ServerContext;
using grpc::ServerCompletionQueue;
using grpc::Status;
using proto::e2c;
using proto::Hash_chain;
using proto::Hash_struct;
using proto::Hash_time;

struct Hash global_tree[256], tree_buf[128];
int server_id[128], id_buf[128];
char center_ip[128], log_file[128];

uint32_t num = 0, sec = 0, usec = 0;
int build_global_tree();
void global_insert(struct Hash in, int id);

class ServerImpl final {
 public:
  ~ServerImpl() {
    server_->Shutdown();
    // Always shutdown the completion queue after the server.
    cq_->Shutdown();
  }

  // There is no shutdown handling in this code.
  void Run() {
    if (DEBUG) printf("run\n");
    std::string server_address(center_ip);

    ServerBuilder builder;
    // Listen on the given address without any authentication mechanism.
    builder.AddListeningPort(server_address, grpc::InsecureServerCredentials());
    // Register "service_" as the instance through which we'll communicate with
    // clients. In this case it corresponds to an *asynchronous* service.
    builder.RegisterService(&service_);
    // Get hold of the completion queue used for the asynchronous communication
    // with the gRPC runtime.
    cq_ = builder.AddCompletionQueue();
    // Finally assemble the server.
    server_ = builder.BuildAndStart();
    std::cout << "Server listening on " << server_address << std::endl;

    // Proceed to the server's main loop.
    HandleRpcs();
  }

 private:
  // Class encompasing the state and logic needed to serve a request.
  class CallData {
   public:
    // Take in the "service" instance (in this case representing an asynchronous
    // server) and the completion queue "cq" used for asynchronous communication
    // with the gRPC runtime.
    CallData(e2c::AsyncService* service, ServerCompletionQueue* cq): service_(service), cq_(cq), responder_(&ctx_), status_(CREATE) {
      // Invoke the serving logic right away.
      Proceed();
    }

    void Proceed() {
      if (DEBUG) printf("proceed\n");
      if (status_ == CREATE) {
        if (DEBUG) printf("status create\n");
        // Make this instance progress to the PROCESS state.
        status_ = PROCESS;

        // As part of the initial CREATE state, we *request* that the system
        // start processing SayHello requests. In this request, "this" acts are
        // the tag uniquely identifying the request (so that different CallData
        // instances can serve different requests concurrently), in this case
        // the memory address of this CallData instance.
        service_->Requestinsert(&ctx_, &request_, &responder_, cq_, cq_,this);
      }
      else if (status_ == PROCESS) {
        if (DEBUG) printf("status process\n");
        // Spawn a new CallData instance to serve new clients while we process
        // the one for this CallData. The instance will deallocate itself as
        // part of its FINISH state.
        new CallData(service_, cq_);
        if (DEBUG) printf("process\n");
        // The actual processing.
        uint32_t sec_, usec_;
        sec_ = request_.t().sec();
        usec_ = request_.t().usec();
        if (sec_ > sec || (sec_ == sec && usec_ > usec)) {
            sec = sec_;
            usec = usec_;
            build_global_tree();
        }
        global_insert(localize(request_.h()), request_.t().id());
        if (DEBUG) printf("global insert\n");
        reply_ = find();
        if (DEBUG) printf("set reply\n");
        // And we are done! Let the gRPC runtime know we've finished, using the
        // memory address of this instance as the uniquely identifying tag for
        // the event.
        status_ = FINISH;
        responder_.Finish(reply_, Status::OK, this);
      }
      else {
        if (DEBUG) printf("status finish\n");
        GPR_ASSERT(status_ == FINISH);
        // Once in the FINISH state, deallocate ourselves (CallData).
        delete this;
      }
    }

   private:
    // The means of communication with the gRPC runtime for an asynchronous
    // server.
    e2c::AsyncService* service_;
    // The producer-consumer queue where for asynchronous server notifications.
    ServerCompletionQueue* cq_;
    // Context for the rpc, allowing to tweak aspects of it such as the use
    // of compression, authentication, as well as to send metadata back to the
    // client.
    ServerContext ctx_;

    // What we get from the client.
    Hash_time request_;
    // What we send back to the client.
    Hash_chain reply_;

    // The means to get back to the client.
    ServerAsyncResponseWriter<Hash_chain> responder_;

    // Let's implement a tiny state machine with the following states.
    enum CallStatus { CREATE, PROCESS, FINISH };
    CallStatus status_;  // The current serving state.

    Hash_chain find() {
        if (DEBUG) printf("in find\n");
        int index = 128;
        Hash_chain res;
        int machine_id = request_.t().id();
        for (int i = 0; i < 128; ++i) {
            if (server_id[i] == machine_id) {
                index = i + 128;
                break;
            }
        }
        if (index % 2 == 0) index += 1;
        else index -= 1;
        res.set_h0(global_tree[index].h0);
        res.set_h1(global_tree[index].h1);
        res.set_h2(global_tree[index].h2);
        res.set_h3(global_tree[index].h3);
        res.set_h4(global_tree[index].h4);
        res.set_h5(global_tree[index].h5);
        res.set_h6(global_tree[index].h6);
        res.set_h7(global_tree[index].h7);
        index >>= 1;
        if (index % 2 == 0) index += 1;
        else index -= 1;
        res.set_h8(global_tree[index].h0);
        res.set_h9(global_tree[index].h1);
        res.set_h10(global_tree[index].h2);
        res.set_h11(global_tree[index].h3);
        res.set_h12(global_tree[index].h4);
        res.set_h13(global_tree[index].h5);
        res.set_h14(global_tree[index].h6);
        res.set_h15(global_tree[index].h7);
        index >>= 1;
        if (index % 2 == 0) index += 1;
        else index -= 1;
        res.set_h16(global_tree[index].h0);
        res.set_h17(global_tree[index].h1);
        res.set_h18(global_tree[index].h2);
        res.set_h19(global_tree[index].h3);
        res.set_h20(global_tree[index].h4);
        res.set_h21(global_tree[index].h5);
        res.set_h22(global_tree[index].h6);
        res.set_h23(global_tree[index].h7);
        index >>= 1;
        if (index % 2 == 0) index += 1;
        else index -= 1;
        res.set_h24(global_tree[index].h0);
        res.set_h25(global_tree[index].h1);
        res.set_h26(global_tree[index].h2);
        res.set_h27(global_tree[index].h3);
        res.set_h28(global_tree[index].h4);
        res.set_h29(global_tree[index].h5);
        res.set_h30(global_tree[index].h6);
        res.set_h31(global_tree[index].h7);
        index >>= 1;
        if (index % 2 == 0) index += 1;
        else index -= 1;
        res.set_h32(global_tree[index].h0);
        res.set_h33(global_tree[index].h1);
        res.set_h34(global_tree[index].h2);
        res.set_h35(global_tree[index].h3);
        res.set_h36(global_tree[index].h4);
        res.set_h37(global_tree[index].h5);
        res.set_h38(global_tree[index].h6);
        res.set_h39(global_tree[index].h7);
        index >>= 1;
        if (index % 2 == 0) index += 1;
        else index -= 1;
        res.set_h40(global_tree[index].h0);
        res.set_h41(global_tree[index].h1);
        res.set_h42(global_tree[index].h2);
        res.set_h43(global_tree[index].h3);
        res.set_h44(global_tree[index].h4);
        res.set_h45(global_tree[index].h5);
        res.set_h46(global_tree[index].h6);
        res.set_h47(global_tree[index].h7);
        index >>= 1;
        if (DEBUG) printf("find finish\n");
        return res;
    }

    Hash_struct assign(struct Hash in) {
        Hash_struct res;
        res.set_h0(in.h0);
        res.set_h1(in.h1);
        res.set_h2(in.h2);
        res.set_h3(in.h3);
        res.set_h4(in.h4);
        res.set_h5(in.h5);
        res.set_h6(in.h6);
        res.set_h7(in.h7);
        return res;
    }

    struct Hash localize(Hash_struct in) {
      struct Hash res;
      res.h0 = in.h0();
      res.h1 = in.h1();
      res.h2 = in.h2();
      res.h3 = in.h3();
      res.h4 = in.h4();
      res.h5 = in.h5();
      res.h6 = in.h6();
      res.h7 = in.h7();
      return res;
    }
  };

  // This can be run in multiple threads if needed.
  void HandleRpcs() {
    // Spawn a new CallData instance to serve new clients.
    new CallData(&service_, cq_.get());
    void* tag;  // uniquely identifies a request.
    bool ok;
    while (true) {
      // Block waiting to read the next event from the completion queue. The
      // event is uniquely identified by its tag, which in this case is the
      // memory address of a CallData instance.
      // The return value of Next should always be checked. This return value
      // tells us whether there is any kind of event or cq_ is shutting down.
      GPR_ASSERT(cq_->Next(&tag, &ok));
      GPR_ASSERT(ok);
      static_cast<CallData*>(tag)->Proceed();
    }
  }

  std::unique_ptr<ServerCompletionQueue> cq_;
  e2c::AsyncService service_;
  std::unique_ptr<Server> server_;
};

int server() {
  ServerImpl server;
  if (DEBUG) printf("server\n");
  server.Run();
  return 0;
}

int build_global_tree() {
    if (DEBUG) printf("build_global_tree\n");
    memset(global_tree, 0, sizeof(global_tree));
    memset(server_id, 0, sizeof(server_id));
    for (int i = 0; i < 128; ++i) 
        global_tree[i + 128] = tree_buf[i];
    for (int i = 0; i < 128; ++i)
        server_id[i + 128] = id_buf[i];
    memset(tree_buf, 0, sizeof(tree_buf));
    memset(id_buf, 0, sizeof(id_buf));
    num = 0;
    for (int i = 255; i > 1; i = i - 2) 
        global_tree[i / 2] = hash_or(&global_tree[i], &global_tree[i - 1]); // the remained position is 0, which does not influence the result
    if (global_tree[1].h0 != 0) printf("root hash: %d\n", global_tree[1].h0);
    // append root hash to file log_file_path as hex with (possible) leading zeros. create the file if not exist
    FILE *fp = fopen(log_file, "a");
    if (DEBUG) printf("open file\n");
    if (fp == NULL) {
        printf("open file failed\n");
        return 1;
    }
    fprintf(fp, "%08x %08x %08x %08x %08x %08x %08x %08x\n", global_tree[1].h0, global_tree[1].h1, global_tree[1].h2, global_tree[1].h3, global_tree[1].h4, global_tree[1].h5, global_tree[1].h6, global_tree[1].h7);
    if (DEBUG) printf("write file\n");
    fclose(fp);
    return 0;
}

void global_insert(struct Hash in, int id) {
    if (in.h0 != 0) printf("insert %d\n", in.h0);
    tree_buf[num] = in;
    id_buf[num] = id;
    ++num;
}

int main(int argc, char** argv) {
    if (argc != 3) {
      std::cerr << "Usage: " << argv[0] << " <log_path> <server_address>" << std::endl;
      return 1;
    }
    strcpy(log_file, argv[1]);
    strcpy(center_ip, argv[2]);
    server();
    return 0;
}