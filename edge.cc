#include <pthread.h>
#include <stdio.h>
#include <string.h>
#include <unistd.h>
#include <sys/time.h>
#include <stdlib.h>
#include "hash.h"
#include <iostream>
#include <memory>
#include <thread>

#include <hiredis/hiredis.h>
#include <grpcpp/grpcpp.h>
#include <grpc/support/log.h>
#include "grpc.grpc.pb.h"

#define TREE_SIZE 65536  // 2^18, need to modify together with time interval
#define DEBUG 0

using grpc::Channel;
using grpc::ClientAsyncResponseReader;
using grpc::ClientContext;
using grpc::CompletionQueue;
using grpc::Status;
using grpc::Server;
using grpc::ServerAsyncResponseWriter;
using grpc::ServerBuilder;
using grpc::ServerContext;
using grpc::ServerCompletionQueue;
using proto::c2s;
using proto::e2c;
using proto::Hash_struct;
using proto::Hash_chain;
using proto::Hash_time;
using proto::time_id;

int server_id = -1;
char center_ip[128], edge_ip[128], redis_ip[128];
int insert(struct Hash in);
Hash_chain ret;

class EdgeClient2 {
  public:
    explicit EdgeClient2(std::shared_ptr<Channel> channel)
            : stub_(e2c::NewStub(channel)) {}

    // Assembles the client's payload and sends it to the server.
    void edge_upload(struct Hash user) {
        if (DEBUG) printf("edge_upload\n");
        // Data we are sending to the server.
        Hash_time request;// = standardize(user);
        Hash_struct* hash = (Hash_struct *)malloc(sizeof(Hash_struct));
        *hash = assign(user);
        request.set_allocated_h(hash);
        time_id* ti = (time_id *)malloc(sizeof(time_id));
        *ti = set_reply();
        request.set_allocated_t(ti);
        // Call object to store rpc data
        AsyncClientCall* call = new AsyncClientCall;
        if (DEBUG) printf("init\n");
        // stub_->PrepareAsyncSayHello() creates an RPC object, returning
        // an instance to store in "call" but does not actually start the RPC
        // Because we are using the asynchronous API, we need to hold on to
        // the "call" instance in order to get updates on the ongoing RPC.
        call->response_reader =
            stub_->PrepareAsyncinsert(&call->context, request, &cq_);
        if (DEBUG) printf("PrepareAsync\n");
        // StartCall initiates the RPC call
        call->response_reader->StartCall();
        if (DEBUG) printf("StartCall\n");
        // Request that, upon completion of the RPC, "reply" be updated with the
        // server's response; "status" with the indication of whether the operation
        // was successful. Tag the request with the memory address of the call object.
        call->response_reader->Finish(&call->reply, &call->status, (void*)call);
        if (DEBUG) printf("finish\n");
    }

    // Loop while listening for completed responses.
    // Prints out the response from the server.
    void AsyncCompleteRpc() {
        void* got_tag;
        bool ok = false;

        // Block until the next result is available in the completion queue "cq".
        while (cq_.Next(&got_tag, &ok)) {
            // The tag in this example is the memory location of the call object
            AsyncClientCall* call = static_cast<AsyncClientCall*>(got_tag);

            // Verify that the request was completed successfully. Note that "ok"
            // corresponds solely to the request for updates introduced by Finish().
            GPR_ASSERT(ok);

            if (call->status.ok())
                ret = call -> reply;
            else
                std::cout << "RPC failed" << std::endl;

            // Once we're complete, deallocate the call object.
            delete call;
        }
    }

  private:

    // struct for keeping state and data information
    struct AsyncClientCall {
        // Container for the data we expect from the server.
        Hash_chain reply;

        // Context for the client. It could be used to convey extra information to
        // the server and/or tweak certain RPC behaviors.
        ClientContext context;

        // Storage for the status of the RPC upon completion.
        Status status;


        std::unique_ptr<ClientAsyncResponseReader<Hash_chain>> response_reader;
    };

    // Out of the passed in Channel comes the stub, stored here, our view of the
    // server's exposed services.
    std::unique_ptr<e2c::Stub> stub_;

    // The producer-consumer queue we use to communicate asynchronously with the
    // gRPC runtime.
    CompletionQueue cq_;

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

  time_id set_reply() {
    time_id reply;
    if (server_id == -1) {
        FILE *fp = fopen("/etc/machine-id", "r"); // need input
        fseek(fp, 0, SEEK_END);
        long len = ftell(fp);
        char *buf = (char *)malloc(len);
        fseek(fp, 0, SEEK_SET);
        fread(buf, len, sizeof(char), fp);
        fclose(fp);
        server_id = strtol(buf, NULL, 16);
        free(buf);
    }
    reply.set_id(server_id);
    struct timeval t;
    gettimeofday(&t, NULL);
    reply.set_sec(t.tv_sec);
    reply.set_usec(t.tv_usec - (t.tv_usec % 200));
    return reply;
  }
};

class EdgeClient { // edge server as client, center server as server (e2c)
 public:
  explicit EdgeClient(std::shared_ptr<Channel> channel): stub_(e2c::NewStub(channel)) {}

  // Assembles the client's payload, sends it and presents the response back
  // from the server.

  Hash_chain edge_upload(struct Hash user) {
    if (DEBUG) printf("edge_upload\n");
    // Data we are sending to the server.
    Hash_time request;// = standardize(user);
    Hash_struct* hash = (Hash_struct *)malloc(sizeof(Hash_struct));
    *hash = assign(user);
    request.set_allocated_h(hash);
    time_id* ti = (time_id *)malloc(sizeof(time_id));
    *ti = set_reply();
    request.set_allocated_t(ti);
    if (DEBUG) printf("standardize\n");
    // Container for the data we expect from the server.
    static Hash_chain reply;

    // Context for the client. It could be used to convey extra information to
    // the server and/or tweak certain RPC behaviors.
    ClientContext context;

    // The producer-consumer queue we use to communicate asynchronously with the
    // gRPC runtime.
    CompletionQueue cq;

    // Storage for the status of the RPC upon completion.
    Status status;
    if (DEBUG) printf("prepare\n");
    // stub_->PrepareAsyncSayHello() creates an RPC object, returning
    // an instance to store in "call" but does not actually start the RPC
    // Because we are using the asynchronous API, we need to hold on to
    // the "call" instance in order to get updates on the ongoing RPC.
    std::unique_ptr<ClientAsyncResponseReader<Hash_chain> > rpc(stub_->PrepareAsyncinsert(&context, request, &cq));
    if (DEBUG) printf("PrepareAsync\n");
    // StartCall initiates the RPC call
    rpc->StartCall();
    if (DEBUG) printf("StartCall\n");
    // Request that, upon completion of the RPC, "reply" be updated with the
    // server's response; "status" with the indication of whether the operation
    // was successful. Tag the request with the integer 1.
    rpc->Finish(&reply, &status, (void*)1);
    if (DEBUG) printf("Finish\n");
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
    // free(hash);
    // free(ti);
    if (status.ok()) {
      if (DEBUG) printf("ok\n");
      return reply;
    }
    else {
      if (DEBUG) printf("not ok\n");
      return reply; // connect again, TODO: prevent endless recursion
    }
  }

 private:
  // Out of the passed in Channel comes the stub, stored here, our view of the
  // server's exposed services.
  std::unique_ptr<e2c::Stub> stub_;

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

  time_id set_reply() {
    time_id reply;
    if (server_id == -1) {
        FILE *fp = fopen("/etc/machine-id", "r"); // need input
        fseek(fp, 0, SEEK_END);
        long len = ftell(fp);
        char *buf = (char *)malloc(len);
        fseek(fp, 0, SEEK_SET);
        fread(buf, len, sizeof(char), fp);
        fclose(fp);
        server_id = strtol(buf, NULL, 16);
        free(buf);
    }
    reply.set_id(server_id);
    struct timeval t;
    gettimeofday(&t, NULL);
    reply.set_sec(t.tv_sec);
    reply.set_usec(t.tv_usec - (t.tv_usec % 200));
    return reply;
  }
};

class EdgeServer final { // edge server as server, client as client (c2s)
 public:
  ~EdgeServer() {
    server_->Shutdown();
    // Always shutdown the completion queue after the server.
    cq_->Shutdown();
  }

  // There is no shutdown handling in this code.
  void Run() {
    if (DEBUG) printf("server run\n");
    std::string server_address(edge_ip);

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
    CallData(c2s::AsyncService* service, ServerCompletionQueue* cq): service_(service), cq_(cq), responder_(&ctx_), status_(CREATE) {
      // Invoke the serving logic right away.
      Proceed();
    }

    void Proceed() {
      if (status_ == CREATE) {
        if (DEBUG) printf("status create\n");
        // Make this instance progress to the PROCESS state.
        status_ = PROCESS;

        // As part of the initial CREATE state, we *request* that the system
        // start processing SayHello requests. In this request, "this" acts are
        // the tag uniquely identifying the request (so that different CallData
        // instances can serve different requests concurrently), in this case
        // the memory address of this CallData instance.
        service_->Requestupload(&ctx_, &request_, &responder_, cq_, cq_,this);
      }
      else if (status_ == PROCESS) {
        if (DEBUG) printf("status process\n");
        // Spawn a new CallData instance to serve new clients while we process
        // the one for this CallData. The instance will deallocate itself as
        // part of its FINISH state.
        new CallData(service_, cq_);

        // The actual processing.
        insert(localize(request_));
        reply_ = set_reply();

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
    c2s::AsyncService* service_;
    // The producer-consumer queue where for asynchronous server notifications.
    ServerCompletionQueue* cq_;
    // Context for the rpc, allowing to tweak aspects of it such as the use
    // of compression, authentication, as well as to send metadata back to the
    // client.
    ServerContext ctx_;

    // What we get from the client.
    Hash_struct request_;
    // What we send back to the client.
    time_id reply_;

    // The means to get back to the client.
    ServerAsyncResponseWriter<time_id> responder_;

    // Let's implement a tiny state machine with the following states.
    enum CallStatus { CREATE, PROCESS, FINISH };
    CallStatus status_;  // The current serving state.

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

    time_id set_reply() {
      time_id reply;
      if (server_id == -1) {
        FILE *fp = fopen("/etc/machine-id", "r"); // need input
        fseek(fp, 0, SEEK_END);
        long len = ftell(fp);
        char *buf = (char *)malloc(len);
        fseek(fp, 0, SEEK_SET);
        fread(buf, len, sizeof(char), fp);
        fclose(fp);
        server_id = strtol(buf, NULL, 16);
        free(buf);
    }
      reply.set_id(server_id);
      struct timeval t;
      gettimeofday(&t, NULL);
      reply.set_sec(t.tv_sec);
      reply.set_usec(t.tv_usec);
      return reply;
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
  c2s::AsyncService service_;
  std::unique_ptr<Server> server_;
};

pthread_mutex_t mutex = PTHREAD_MUTEX_INITIALIZER;
struct Hash binary_tree1[TREE_SIZE];
struct Hash binary_tree2[TREE_SIZE];

int num = TREE_SIZE / 2, tree_num = 1;

int insert(struct Hash in) {
    // printf("insert %d\n", in.h0);
    pthread_mutex_lock(&mutex);
    if (tree_num == 1) {
        binary_tree1[num] = in;
    } else {
        binary_tree2[num] = in;
    }
    ++num;
    pthread_mutex_unlock(&mutex);
    return 0;
}

int build_tree(int num) { // the number of hash
    int tmp = 1;
    while (num > tmp) {
        tmp <<= 1;
    }
    if (tree_num == 1) {
        if (tmp < TREE_SIZE / 2) {
            for (int i = 0; i < num; ++i) {
                binary_tree2[tmp + i] = binary_tree2[TREE_SIZE / 2 + i];
            }
        }
        for (int i = tmp * 2 - 1; i > 1; i = i - 2) {
            binary_tree2[i / 2] = hash_or(&binary_tree2[i], &binary_tree2[i - 1]); // the remained position is 0, which does not influence the result
        }
        // if (binary_tree2[1].h0 != 0) printf("root = %d\n", binary_tree2[1].h0);
    }
    else {
        if (tmp < TREE_SIZE / 2) {
            for (int i = 0; i < num; ++i) {
                binary_tree1[tmp + i] = binary_tree1[TREE_SIZE / 2 + i];
            }
        }
        for (int i = tmp * 2 - 1; i > 1; i = i - 2) {
            binary_tree1[i / 2] = hash_or(&binary_tree1[i], &binary_tree1[i - 1]);
        }
        // if (binary_tree1[1].h0 != 0) printf("root = %d\n", binary_tree1[1].h0);
    }
    return 0;
}

void thread_insert() {
    if (DEBUG) printf("thread_insert\n");
    EdgeServer server;
    server.Run();
}

inline void chain_string(Hash_chain ret, char *global_route) {
    char tmp[16];
    sprintf(tmp, "%08x ", ret.h0());
    strtok(global_route, tmp);
    sprintf(tmp, "%08x ", ret.h1());
    strtok(global_route, tmp);
    sprintf(tmp, "%08x ", ret.h2());
    strtok(global_route, tmp);
    sprintf(tmp, "%08x ", ret.h3());
    strtok(global_route, tmp);
    sprintf(tmp, "%08x ", ret.h4());
    strtok(global_route, tmp);
    sprintf(tmp, "%08x ", ret.h5());
    strtok(global_route, tmp);
    sprintf(tmp, "%08x ", ret.h6());
    strtok(global_route, tmp);
    sprintf(tmp, "%08x ", ret.h7());
    strtok(global_route, tmp);
    sprintf(tmp, "%08x ", ret.h8());
    strtok(global_route, tmp);
    sprintf(tmp, "%08x ", ret.h9());
    strtok(global_route, tmp);
    sprintf(tmp, "%08x ", ret.h10());
    strtok(global_route, tmp);
    sprintf(tmp, "%08x ", ret.h11());
    strtok(global_route, tmp);
    sprintf(tmp, "%08x ", ret.h12());
    strtok(global_route, tmp);
    sprintf(tmp, "%08x ", ret.h13());
    strtok(global_route, tmp);
    sprintf(tmp, "%08x ", ret.h14());
    strtok(global_route, tmp);
    sprintf(tmp, "%08x ", ret.h15());
    strtok(global_route, tmp);
    sprintf(tmp, "%08x ", ret.h16());
    strtok(global_route, tmp);
    sprintf(tmp, "%08x ", ret.h17());
    strtok(global_route, tmp);
    sprintf(tmp, "%08x ", ret.h18());
    strtok(global_route, tmp);
    sprintf(tmp, "%08x ", ret.h19());
    strtok(global_route, tmp);
    sprintf(tmp, "%08x ", ret.h20());
    strtok(global_route, tmp);
    sprintf(tmp, "%08x ", ret.h21());
    strtok(global_route, tmp);
    sprintf(tmp, "%08x ", ret.h22());
    strtok(global_route, tmp);
    sprintf(tmp, "%08x ", ret.h23());
    strtok(global_route, tmp);
    sprintf(tmp, "%08x ", ret.h24());
    strtok(global_route, tmp);
    sprintf(tmp, "%08x ", ret.h25());
    strtok(global_route, tmp);
    sprintf(tmp, "%08x ", ret.h26());
    strtok(global_route, tmp);
    sprintf(tmp, "%08x ", ret.h27());
    strtok(global_route, tmp);
    sprintf(tmp, "%08x ", ret.h28());
    strtok(global_route, tmp);
    sprintf(tmp, "%08x ", ret.h29());
    strtok(global_route, tmp);
    sprintf(tmp, "%08x ", ret.h30());
    strtok(global_route, tmp);
    sprintf(tmp, "%08x ", ret.h31());
    strtok(global_route, tmp);
    sprintf(tmp, "%08x ", ret.h32());
    strtok(global_route, tmp);
    sprintf(tmp, "%08x ", ret.h33());
    strtok(global_route, tmp);
    sprintf(tmp, "%08x ", ret.h34());
    strtok(global_route, tmp);
    sprintf(tmp, "%08x ", ret.h35());
    strtok(global_route, tmp);
    sprintf(tmp, "%08x ", ret.h36());
    strtok(global_route, tmp);
    sprintf(tmp, "%08x ", ret.h37());
    strtok(global_route, tmp);
    sprintf(tmp, "%08x ", ret.h38());
    strtok(global_route, tmp);
    sprintf(tmp, "%08x ", ret.h39());
    strtok(global_route, tmp);
    sprintf(tmp, "%08x ", ret.h40());
    strtok(global_route, tmp);
    sprintf(tmp, "%08x ", ret.h41());
    strtok(global_route, tmp);
    sprintf(tmp, "%08x ", ret.h42());
    strtok(global_route, tmp);
    sprintf(tmp, "%08x ", ret.h43());
    strtok(global_route, tmp);
    sprintf(tmp, "%08x ", ret.h44());
    strtok(global_route, tmp);
    sprintf(tmp, "%08x ", ret.h45());
    strtok(global_route, tmp);
    sprintf(tmp, "%08x ", ret.h46());
    strtok(global_route, tmp);
    sprintf(tmp, "%08x ", ret.h47());
    strtok(global_route, tmp);
}

inline void hash_string(struct Hash node, char *route) {
    char tmp[16];
    sprintf(tmp, "%08x ", node.h0);
    strcat(route, tmp);
    sprintf(tmp, "%08x ", node.h1);
    strcat(route, tmp);
    sprintf(tmp, "%08x ", node.h2);
    strcat(route, tmp);
    sprintf(tmp, "%08x ", node.h3);
    strcat(route, tmp);
    sprintf(tmp, "%08x ", node.h4);
    strcat(route, tmp);
    sprintf(tmp, "%08x ", node.h5);
    strcat(route, tmp);
    sprintf(tmp, "%08x ", node.h6);
    strcat(route, tmp);
    sprintf(tmp, "%08x ", node.h7);
    strcat(route, tmp);
}

void thread_build_tree() {
    if (DEBUG) printf("thread_build_tree\n");
    struct timeval t1, t2;
    gettimeofday(&t2, NULL);
    while (1) {
        if (DEBUG) printf("endless cycle\n");
        while(1) {
            gettimeofday(&t1, NULL);
            if ((t1.tv_sec - t2.tv_sec) * 1000 + t1.tv_usec - t2.tv_usec > 100 && t1.tv_usec % 200 < 100) break; // 0.2s
        }
        pthread_mutex_lock(&mutex);
        if (tree_num == 1) tree_num = 2;
        else tree_num = 1;
        int hash_num = num - TREE_SIZE / 2;
        num = TREE_SIZE / 2;
        pthread_mutex_unlock(&mutex);
        gettimeofday(&t2, NULL);
        build_tree(hash_num);
        EdgeClient ec(grpc::CreateChannel(center_ip, grpc::InsecureChannelCredentials()));
        // std::thread thread_ = std::thread(&EdgeClient2::AsyncCompleteRpc, &ec);
        Hash_chain ret;

        // redis init
        char *redis_port = strtok(redis_ip, ":");
        int port = atoi(redis_port);
        redisContext *c = redisConnect(redis_ip, port);
        while (c != NULL && c->err) {
            c = redisConnect(redis_ip, port); // endless try
        }

        if (tree_num == 1) {
          if (DEBUG) printf("tree1\n");
          if (binary_tree2[1].h0 != 0) printf("upload %d\n", binary_tree2[1].h0);
          ret = ec.edge_upload(binary_tree2[1]);
          if (DEBUG) printf("upload\n");
          // thread_ .join();
          for (int i = TREE_SIZE / 2; i < TREE_SIZE; ++i) {
              char global_route[512];
              chain_string(ret, global_route);
              char route[2048];
              char key[128];
              struct Hash key_node = binary_tree2[i];
              hash_string(key_node, key);
              for (int j = i; j > 1; j = j / 2) {
                  if (j % 2 == 0) j += 1;
                  else j -= 1;
                  struct Hash node = binary_tree2[j];
                  hash_string(node, route);
              }
              strcat(route, global_route);
              redisCommand(c, "SET %s %s", key, route);
          }
          memset(binary_tree2, 0, sizeof(binary_tree2));
        }
        else {
          if (DEBUG) printf("tree2\n");
          if (binary_tree1[1].h0 != 0) printf("upload %d\n", binary_tree1[1].h0);
          ret = ec.edge_upload(binary_tree1[1]);
          if (DEBUG) printf("upload\n");
          // thread_ .join();
          for (int i = TREE_SIZE / 2; i < TREE_SIZE; ++i) {
              char global_route[512];
              chain_string(ret, global_route);
              char route[2048];
              char key[128];
              struct Hash key_node = binary_tree1[i];
              hash_string(key_node, key);
              for (int j = i; j > 1; j = j / 2) {
                  if (j % 2 == 0) j += 1;
                  else j -= 1;
                  struct Hash node = binary_tree1[j];
                  hash_string(node, route);
              }
              strcat(route, global_route);
              redisCommand(c, "SET %s %s", key, route);
          }
          memset(binary_tree1, 0, sizeof(binary_tree1));
        }
        redisFree(c);
    }
}

int main(int argc, char** argv) {
    if (DEBUG) printf("start\n");
    if (argc != 3) {
      std::cerr << "Usage: " << argv[0] << " <server_ip> <server_port>" << std::endl;
      return 1;
    }
    strcpy(center_ip, argv[1]);
    strcpy(edge_ip, argv[2]);
    strcpy(redis_ip, argv[3]);
    //pthread_t t1, t2;
    //pthread_create(&t2, NULL, (void *(*)(void *))thread_insert, NULL);
    std::thread thread2 = std::thread(&thread_insert);
    thread_build_tree();
    thread2.join();
    //pthread_join(t2, NULL);
    return 0;
}