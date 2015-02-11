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
.factory('Oauth2Service', ['$rootScope', '$http', 'authService', 'Session', 'Account',  '$log', 'localStorageService','EnteService','$location','$base64',
    function ($rootScope, $http, authService, Session, Account,$log, localStorageService, EnteService,$location,$base64) {
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
.factory('AuthenticationSharedService', ['$rootScope', '$http', 'authService', 'Session', 'Account',  '$log', 'localStorageService','EnteService','Oauth2Service', 'ENV',
    function ($rootScope, $http, authService, Session, Account,$log, localStorageService, EnteService, Oauth2Service,ENV) {
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

                var data = "grant_type=password&client_id="+ENV.ClientId+"&scope=read&username="+  param.username +"&password="+  param.password ;
                $log.info('data:' + data);
                Oauth2Service.clear();
                $http.post('/manager/oauth/token', data, {
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded"
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
.factory('ngstomp',  ['$rootScope', '$log',  
  function($rootScope, $log ) {
    var self = this;
    
    self.stompClient = {};

     function NGStomp(url,headers) {
           
     
 
     var  socket = new SockJS
                     ( url 
                     , 'tino:tino'
                     , {   'debug':false
                         , 'devel' : false
                         , 'info' :{ 'headers': headers } 
                         , 'protocols_whitelist':
                             [ 'xdr-streaming'
                             , 'xdr-polling'
                             , 'xhr-streaming'
                             , 'iframe-eventsource'
                             , 'iframe-htmlfile'
                             , 'xhr-polling'
                             , 'websocket'
                             ]

                       }
                     );

           self.stompClient = Stomp.over( socket );
        }


        NGStomp.prototype.subscribe = function(queue, callback) {
            self.stompClient.subscribe(queue, function() {
                var args = arguments;
                $rootScope.$apply(function() {
                    callback(args[0]);
                });
            });
        };

        NGStomp.prototype.send = function(queue, headers, data) {
          self.stompClient.send(queue, headers, JSON.stringify(data));
        };

        NGStomp.prototype.connect = function(user, password, on_connect, on_error) {

          self.stompClient.connect(user, password,
                function() {
              var args = arguments;
                    $rootScope.$apply(function() {
                        on_connect.call(undefined,args);
                    });
                },
                function() {
                  var args = arguments;
                    $rootScope.$apply(function() {                      
                        on_error.apply(undefined,args);
                    });
                });
        };

        NGStomp.prototype.disconnect = function(callback) {
          self.stompClient.disconnect(function() {
                var args = arguments;
                $rootScope.$apply(function() {
                    callback.apply(args);
                });
            });
        };

        return function(url,headers) {
        
        

          return new NGStomp( url,headers );
        };
}]);

