/**
@fileOverview

@toc

*/

'use strict';


angular.module('ipublic.ntipa-angular', [])
.factory('EnteService', ['$resource',
   function ($resource) {
       return $resource('/manager/app/rest/account/:action/:enteId/:gruppoId', {}, {
           'enties': { method: 'GET', isArray: true, params: { 'action': 'enties'}},
           'organigramma': { method: 'GET', isArray: false, params: { 'action': 'enties','gruppoId':'organigramma'}},
           'group': { method: 'GET', isArray: false, params: { 'action': 'groups'}}
       });
   }])
.factory('Password', ['$resource',
    function ($resource) {
        return $resource('/manager/app/rest/account/change_password', {}, {
        });
    }])
.factory('Sessions', ['$resource',
    function ($resource) {
        return $resource('/manager/app/rest/account/sessions/:series', {}, {
            'get': { method: 'GET', isArray: true}
        });
    }])
.factory('Oauth2Service', ['$rootScope', '$http', 'authService', 'Session', 'Account',  '$log', 'localStorageService','EnteService','$location','$base64','NotifyWebsocket',
    function ($rootScope, $http, authService, Session, Account,$log, localStorageService, EnteService,$location,$base64,NotifyWebsocket) {
        var keyAuthorization = 'Authorization';
        var keyAccessToken = 'access.token';
        var keySession = 'user.session';
        var keyEntiesSession = 'enties.session';
        var keyOrganigramma = 'organigramma';
        
        var keyCategorias = 'keyCategorias';
        var keyTitolaris = 'keyTitolaris';
        var keyStrutturas = 'keyStrutturas';
        var keyUsers = 'keyUsers';

        var keyMapCategorias = 'keyMapCategorias';
        var keyMapTitolaris = 'keyMapTitolaris';
     

        function recursiveVociTitolario(nodes,titolarioName, titolarioId, titolarioCodice){

            angular.forEach(nodes, function(nodo) {

                var nodoCorrente ={
                    titolarioId: titolarioId,
                    titolarioName: titolarioName,
                    titolarioCodice: titolarioCodice,
                    titolarioIdVoce: nodo.id,
                    titolarioCodiceVoce: nodo.indice,
                    titolarioNomeVoce: nodo.voce,
                };
               // $log.debug(nodo);
               // $log.debug(nodoCorrente);
                $rootScope.titolari.push(nodoCorrente);

                recursiveVociTitolario(nodo.nodes, titolarioName , titolarioId, titolarioCodice);
            });
        }

        function recursiveStruttura(struttura,paths){
            $log.debug('struttura:'+struttura);
            paths = paths+ ' ' +struttura.name;

            angular.forEach(struttura.categorie, function(categoria) {
             $rootScope.categorias.push(categoria);
             });

              angular.forEach(struttura.titolari, function(titolario) {
                titolario.nodes = angular.fromJson(titolario.voci);
                recursiveVociTitolario(titolario.nodes,titolario.name,titolario.id, titolario.codice);

                
             });


            angular.forEach(struttura.gruppi, function(gruppo) {
             gruppo.struttura= {name:paths};
             $rootScope.strutturas.push(gruppo);

             angular.forEach(gruppo.utenti, function(utente) {
                 $rootScope.users.push(utente);
             });

         });

            angular.forEach(struttura.children, function(struttura2) {
              recursiveStruttura(struttura2,paths);
          });

        }

        return {
            loadAccount:  function (){
                $log.debug('loadAccount:' );
                Account.get(function(data) {
                    

                    $rootScope.account = data;
                    localStorageService.add(keySession, data);
                    $log.debug('data.enteId:'+data.enteId);
                    $rootScope.$broadcast('loadAccountEvent', data);

                    if(data.enteId !== null && data.enteId !== 'null' ){
                        EnteService.organigramma({enteId:data.enteId},function(data){
                            $rootScope.organigramma = data;
                            localStorageService.add(keyOrganigramma, $rootScope.organigramma);

                            $rootScope.users = [];
                            $rootScope.categorias = [];
                            $rootScope.titolari = [];
                            $rootScope.strutturas = [];

                            $log.debug(data);
                            angular.forEach(data.strutture, function(struttura) {
                                recursiveStruttura(struttura, '' );
                            } );


                            localStorageService.remove(keyCategorias );
                            localStorageService.remove(keyStrutturas );
                            localStorageService.remove(keyTitolaris );
                            localStorageService.remove(keyUsers );

                            localStorageService.add(keyCategorias, $rootScope.categorias);
                            localStorageService.add(keyStrutturas, $rootScope.strutturas);
                            localStorageService.add(keyTitolaris, $rootScope.titolari);
                            localStorageService.add(keyUsers, $rootScope.users);


                            $rootScope.mapCategorias = {};
                            angular.forEach($rootScope.categorias , function( categoria  ) {
                              $rootScope.mapCategorias[categoria.id] = categoria;
                            } );
                            localStorageService.add(keyMapCategorias, $rootScope.mapCategorias);
                           

                            $rootScope.mapTitolaris = {};
                            angular.forEach($rootScope.titolari , function( item  ) {
                              $rootScope.mapTitolaris[item.idVoce] = item;
                            } );
                            localStorageService.add(keyMapTitolaris, $rootScope.mapTitolaris);

                           
                         $rootScope.$broadcast('organigrammaLoadedEvent', data);
                        });

                    $rootScope.$broadcast('enteLoadedEvent', data);
                }

                EnteService.enties(function(data){
                 localStorageService.add(keyEntiesSession, data );
                 $rootScope.enties = data;
                });

                Session.create(data.login, data.firstName, data.lastName, data.email, data.roles);
                authService.loginConfirmed(data);
                });
            },
            loadLocalToken: function() {
              $rootScope.token = localStorageService.get(keyAuthorization);
              $rootScope.accessToken = localStorageService.get(keyAccessToken);
              $log.info('getLocalToken:' + $rootScope.token);
              if ($rootScope.token !== null) {
                $http.defaults.headers.common[keyAuthorization] = $rootScope.token;

                var data = localStorageService.get(keySession);
                $rootScope.enties =localStorageService.get(keyEntiesSession );

                if(data !== null && data.login !== null){
                    $rootScope.account = data;
                    Session.create(data.login, data.firstName, data.lastName, data.email, data.roles);
                    $rootScope.users = [];
                    $rootScope.strutturas = [];
                    $rootScope.categorias = [];
                    $rootScope.titolari = [];

                    $rootScope.organigramma = localStorageService.get(keyOrganigramma );
                    $rootScope.categorias = localStorageService.get(keyCategorias);
                    $rootScope.strutturas = localStorageService.get(keyStrutturas);
                    $rootScope.titolari = localStorageService.get(keyTitolaris);
                    $rootScope.users = localStorageService.get(keyUsers);

                    $rootScope.mapCategorias =    localStorageService.get(keyMapCategorias );
                    $rootScope.mapTitolaris =    localStorageService.get(keyMapTitolaris );

                    $rootScope.$broadcast('localTokenLoadedEvent', data);
                    $log.info('getLocaluser:' );
                    $log.info($rootScope.account);
                }else{
                   $location.path('/login').replace();
               }

            }
            },clear: function () {
                $log.info('clear');
                $rootScope.authenticationError = false;
                $rootScope.authenticationError = false;
                $rootScope.authenticated = false;

               
                $rootScope.username = '';
                $rootScope.password = '';
                $rootScope.account = null;
                $rootScope.user = null;
               
                $rootScope.token = '';
                $rootScope.accessToken = '';

                localStorageService.remove(keyAuthorization);
                localStorageService.remove(keyAccessToken);
                localStorageService.remove(keySession);

                
               localStorageService.remove(keyEntiesSession);
               localStorageService.remove(keyCategorias);
               localStorageService.remove(keyTitolaris);
               localStorageService.remove(keyStrutturas);
               localStorageService.remove(keyUsers);
            

                $rootScope.authenticated = false;
                $rootScope.account = null;
                $rootScope.user = null;
                localStorageService.remove(keyAuthorization);
                localStorageService.remove(keyAccessToken);
                localStorageService.remove(keySession);
                delete $http.defaults.headers.common[keyAuthorization];
                $rootScope.token = '';
                $rootScope.accessToken = '';

               Session.invalidate();

              delete $http.defaults.headers.common[keyAuthorization];
          

        }



            };
}])
.factory('AuthenticationSharedService', ['$rootScope', '$http', 'authService', 'Session', 'Account',  '$log', 'localStorageService','EnteService','Oauth2Service', 'ENV','$base64','NotifyWebsocket',
    function ($rootScope, $http, authService, Session, Account,$log, localStorageService, EnteService, Oauth2Service,ENV,$base64,NotifyWebsocket) {
        var keyAuthorization = 'Authorization';
        var keyAccessToken = 'access.token';
        var keySession = 'user.session';
        var keyEntiesSession = 'enties.session';

        var keyCategorias = 'categorias';
        var keyTitolaris = 'titolaris';
        var keyStrutturas = 'strutturas';
        var keyUsers = 'users';



        return {

            login: function (param) {

                var data = "grant_type=password&client_id="+ENV.ClientId+ "&client_secret="+ENV.ClientSecret+"&scope=read&username="+  param.username +"&password="+  param.password ;
                $log.info('data:' + data);
                Oauth2Service.clear();
                $http.post('/manager/oauth/token', data, {
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded",
                        "Accept": "application/json",
                        "Authorization": "Basic " + $base64.encode(ENV.ClientId + ':' + ENV.ClientSecret )
                    },
                    ignoreAuthModule: 'ignoreAuthModule'
                }).success(function (data, status, headers, config) {
                    $rootScope.authenticationError = false;
                    $rootScope.accessToken = data.access_token;
                    var token = 'Bearer ' + $rootScope.accessToken;
                    $log.info('login Authorization:' + token);
                    $http.defaults.headers.common[keyAuthorization] = token;

                    localStorageService.add(keyAuthorization, token);
                    localStorageService.add(keyAccessToken, $rootScope.accessToken);

                    Oauth2Service.loadAccount();
                }).error(function (data, status, headers, config) {
                    $rootScope.$broadcast("event:auth-bad-credentials");
                    $rootScope.authenticationError = true;
                    Session.invalidate();
                });
            },
            changeRoles: function (enteId,gruppoId) {
                $log.info('enteId:' + enteId);
                $log.info('gruppoId:' + gruppoId);

                var data = $rootScope.accessToken+"/"+enteId+"/"+gruppoId;

                $http.get('/manager/oauth/users/change/roles/'+data )
                .success(function (data, status, headers, config) {
                    Oauth2Service.loadAccount();
                }).error(function (data, status, headers, config) {
                    $rootScope.authenticationError = true;
                });
            },
            valid: function (authorizedRoles) {
                $log.info('on valid authorizedRoles'+authorizedRoles);

                $log.info('on valid !!Session.login'+!!Session.login);
                

                    if (!!Session.login) {
                            if (!$rootScope.isAuthorized(authorizedRoles)) {
                                event.preventDefault();
                                // user is not allowed
                                $rootScope.$broadcast("event:auth-notAuthorized");
                            }
                            $rootScope.authenticated = true;
                    }

                    $rootScope.authenticated = !!Session.login;
            },
            isAuthorized: function (authorizedRoles) {
    
         if (!angular.isArray(authorizedRoles)) {
            if (authorizedRoles == '*') {
                return true;
            }

            authorizedRoles = [authorizedRoles];
         }
            var isAuthorized = false;
            angular.forEach(authorizedRoles, function(authorizedRole) {
            var authorized = (!angular.isUndefined(Session.userRoles) && !!Session.login && !angular.isUndefined(Session.userRoles) &&
            Session.userRoles.indexOf(authorizedRole) !== -1);
            if (authorized || authorizedRole == '*') {
                isAuthorized = true;
            }
         });

         return isAuthorized;
     },
     logout: function () {
        var logoutUrl = '/manager/oauth/users/logout/'+ Session.login +'/tokens/'+$rootScope.accessToken;
        $log.debug("logoutUrl:"+logoutUrl);
      
        $http.get( logoutUrl   )
        .success(function (data, status, headers, config) {
                 Session.invalidate();
                 NotifyWebsocket.disconnect();
                 Oauth2Service.clear();

         })
        .error(function (data, status, headers, config) {
                   Oauth2Service.clear();

          });
        
     },
     loadLocalToken: function() {
        Oauth2Service.loadLocalToken();
     }
 };
}])
.factory('NotifyWebsocket',
['$rootScope','$log','$q', '$timeout', '$location',  
   function ($rootScope,$log,$q, $timeout, $location) {
       
    var service = {}; 
    var listener = $q.defer();
    var listenerHistory = $q.defer();
    var listenerCountHistory = $q.defer();
    var listenerReceive = $q.defer();
    var listenerRoom = $q.defer();
    
    var stomp = null;
    var socket = null;
    
    service.RECONNECT_TIMEOUT = 300;
    service.SOCKET_URL = "";
    service.LOGIN = "";
    

    service.MAPPING_HISTORY = "/websocket/requestNotifyHistory";
    service.MAPPING_READ = "/websocket/readNotify";
    service.MAPPING_SEND = "/websocket/sendNotify";
    service.MAPPING_DELIVERY = "/websocket/deliveryNotify";

    //simple  stomp
    service.PREFIX_USER_SIMPLE_SUBSCRIBE = '/user/';
    service.HISTORY_SUBSCRIBE = '/historywebsocket';
    service.HISTORY_COUNT_SUBSCRIBE = '/historycountwebsocket';
    service.HISTORY_ROOM_SUBSCRIBE = '/roomwebsocket';


    //relay stomp 
    service.PREFIX_USER_SUBSCRIBE = 'ntipa.user.';

    service.RECEIVE_SUBSCRIBE = '.receivewebsocket';
    service.WEBSOCKET_SUBSCRIBE = '.websocket';


    service.readMessage = function(message){
       stomp.send( service.MAPPING_READ , {},
                   JSON.stringify(  { id: message.id } ));
    };
    
    service.deliveryMessage = function(message){
       stomp.send( service.MAPPING_DELIVERY , {},
                   JSON.stringify( { id: message.id } ));
    };

    service.sendMessage = function(message){
       stomp.send( service.MAPPING_SEND , {},
                   JSON.stringify( message ));
    };

    service.loadHistory = function(message){
       stomp.send( service.MAPPING_HISTORY ,
                    {},
                   JSON.stringify( message ));
    };

//LISTENER 
    service.receive = function() {
      return listenerReceive.promise;
    };

    service.history = function() {
      return listenerHistory.promise;
    };


  service.room = function() {
      return listenerRoom.promise;
    };

    service.countHistory = function() {
      return listenerCountHistory.promise;
    };

    service.message = function() {
      return listener.promise;
    };
    

    var reconnect = function() {
      $timeout(function() {
        initialize();
      }, this.RECONNECT_TIMEOUT);
    };
    
    
    var pageRequest={page:'0',size:'10'};

    var startListener = function() {
      stomp.subscribe(service.PREFIX_USER_SUBSCRIBE +service.LOGIN+ service.WEBSOCKET_SUBSCRIBE  , function(data) {
        listener.notify( JSON.parse(data.body)  );
      });

     stomp.subscribe( service.PREFIX_USER_SIMPLE_SUBSCRIBE +service.LOGIN + service.HISTORY_SUBSCRIBE   , function(data) {
        listenerHistory.notify( JSON.parse(data.body)  );
      });

     stomp.subscribe( service.PREFIX_USER_SIMPLE_SUBSCRIBE +service.LOGIN + service.HISTORY_COUNT_SUBSCRIBE   , function(data) {
        var mes =  JSON.parse(data.body);
        listenerCountHistory.notify( mes  );
        $rootScope.countHistory =  mes ;
      });

      stomp.subscribe( service.PREFIX_USER_SIMPLE_SUBSCRIBE +service.LOGIN + service.HISTORY_ROOM_SUBSCRIBE   , function(data) {
          listenerRoom.notify( JSON.parse(data.body) );
      });


     stomp.subscribe( service.PREFIX_USER_SUBSCRIBE +service.LOGIN + service.RECEIVE_SUBSCRIBE   , function(data) {
        
        listenerReceive.notify(  JSON.parse(data.body)   );
        
      });

     service.loadHistory( pageRequest );
    };

    var  initialize = function(     ) {
     if(stomp === null ){
          stomp  = Stomp.client( service.SOCKET_URL  );
          stomp.connect({}, startListener);
          stomp.onclose = reconnect;  
      }
      
    };

    service.disconnect = function() {
     if(stomp !== null){
        stomp.disconnect(function() {
            $log.debug("Stomp disconnesso");
            stomp = null;
        });
        stomp = null;
     }
        
    };

    service.initialize = function( accessToken,   login ) {
      var host = $location.host();
      var port = $location.port();
      var url = 'ws://'+host+':'+port+'/manager/websocket/notify?access_token=' + accessToken ;
      service.SOCKET_URL = url;
      service.LOGIN = login;
      initialize();
    };
    
    
    return service;

}])
.controller('NotifyController', ['$scope','$log'  ,'$rootScope', '$filter', 'NotifyMessage','NotifyWebsocket', 
    function ($scope,$log, $rootScope, $filter, NotifyMessage, NotifyWebsocket ) {
    
    
    $scope.notifyHistory ={};
    $scope.dateNotify =null;
    
   
    $scope.sortSendDate = function() {
        return function(object) {
            return object.value.sendDate;
        };
    };

    $scope.notifyMessage={
        fromLogin:$rootScope.account.login,
        message:'',
        stato:'NEW',
        businessKey:null,
        utenti:[],
        gruppi:[]
    };
        

        
    $scope.readMessage = function(message) {
        NotifyWebsocket.readMessage( message );
        $scope.addNotifyHistory(message);
    };
 

 $scope.sendRestMessage = function() {
        $scope.pageRequest.businessKey=$scope.notifyMessage.businessKey;

        NotifyMessage.create($scope.notifyMessage, function(data) {
            $log.debug('data: '+data);
            $scope.notifyMessage.message='';
        });
    };

    $scope.newRoom = function ( ) {
                $scope.notifyMessage.businessKey=null;
                $scope.notifyMessage.title=null;
                $scope.notifyMessage.utenti=[] ;
                $scope.notifyMessage.gruppi=[];
    };




 
      $scope.filterRoom = function (room) {
            $scope.dateNotify =null;
            $scope.notifyHistory ={};

            $scope.pageRequest={};
            $scope.pageRequest.page=0;
            $scope.pageRequest.size=10;
            $scope.pageRequest.businessKey=room.businessKey;

            $scope.notifyMessage.businessKey=room.businessKey;
            $scope.notifyMessage.title=room.title;
            $scope.notifyMessage.utenti=room.utenti;
            $scope.notifyMessage.gruppi=room.gruppi;

             NotifyWebsocket.loadHistory( $scope.pageRequest );  
      };


    $scope.nextPageMessage = function(  ) {
        $scope.pageRequest.page++;
        NotifyWebsocket.loadHistory( $scope.pageRequest );
     };

    $scope.sendRequestHistory = function ( ) {
        $scope.pageRequest={};
        $scope.pageRequest.page=0;
        $scope.pageRequest.size=10;

        NotifyWebsocket.loadHistory( $scope.pageRequest );     
    };
    
    NotifyWebsocket.message().then(null, null, function(message) {
      NotifyWebsocket.deliveryMessage( message );  
      
      if( $scope.pageRequest.businessKey  === null ){
        NotifyWebsocket.readMessage( message );  
        $scope.addNotifyHistory(message);
      }
      else if(message.businessKey === $scope.pageRequest.businessKey ) {
        NotifyWebsocket.readMessage( message );  
        $scope.addNotifyHistory(message);
      }
    });

    NotifyWebsocket.history().then(null, null, function(message) {
       $scope.addNotifyHistory( message );
    });

    NotifyWebsocket.receive().then(null, null, function(receive) {
        $log.debug("addReciveNotify");
        $scope.notifyHistory[receive.notifyMessageId].mapReceiveMessages[receive.toLogin] = receive;

    });

    $rootScope.rooms ={ };
    NotifyWebsocket.room().then(null, null, function(room) {
        $rootScope.rooms[room.businessKey] =room;
    });



 
    $scope.addNotifyHistory = function (notify) {
       $log.debug("addNotifyHistory");
        $scope.notifyHistory[notify.id]=notify;
    };

    $scope.isEqualDate = function (data1, data2) {
        data1 = $filter('date')(data1, 'dd MMMM yyyy');
        data2 = $filter('date')(data2, 'dd MMMM yyyy');
        if(data1===data2)
            return true;
        else
            return false;
    };


    $scope.getStatus = function (from,receives) {
        var statoClass = 'controlNotify';
        
        angular.forEach(receives,function(receive){            
            if(receive.stato !== 'LETTO'){
                statoClass = 'controlNotifyRead';
            }
        } );
        return statoClass;
    };



    $scope.viewDate = function (date) {     

        $log.debug("$scope.dateNotify === nul_"+$scope.dateNotify === null);

        if($scope.dateNotify === null ){
            $scope.dateNotify = date;
            return true;
        }else if(!$scope.isEqualDate($scope.dateNotify,date)){
            $scope.dateNotify = date;
            return true;
        }else{
         return false;
        }
    };
    
    $scope.init = function (){
        $scope.sendRequestHistory( );

    };

        
}]);

 