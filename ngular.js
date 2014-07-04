/**
@fileOverview

@toc

*/

'use strict';

angular.module('ipublic.ntipa-angular', [])
.factory('ipupNgular', [ function () {

	//public methods & properties
	var self ={
	};
	
	//private methods and properties - should ONLY expose methods and properties publicly (via the 'return' object) that are supposed to be used; everything else (helper methods that aren't supposed to be called externally) should be private.
	
	return self;
}]);



angular.module('ipublic.ntipa-angular', [])
.factory('Account', ['$resource',
    function ($resource) {
        return $resource('./app/rest/account', {}, {
        });
    }]);

angular.module('ipublic.ntipa-angular', [])
.factory('Ente', ['$resource',
   function ($resource) {
       return $resource('/manager/app/rest/account/:action/:enteId/:gruppoId', {}, {
           'enties': { method: 'GET', isArray: true, params: { 'action': 'enties'}},
           'organigramma': { method: 'GET', isArray: false, params: { 'action': 'enties','gruppoId':'organigramma'}},
           'group': { method: 'GET', isArray: false, params: { 'action': 'groups'}}
       });
   }]);

angular.module('ipublic.ntipa-angular', [])
.factory('Password', ['$resource',
    function ($resource) {
        return $resource('/manager/app/rest/account/change_password', {}, {
        });
    }]);


angular.module('ipublic.ntipa-angular', [])
.factory('Sessions', ['$resource',
    function ($resource) {
        return $resource('/manager/app/rest/account/sessions/:series', {}, {
            'get': { method: 'GET', isArray: true}
        });
    }]);

angular.module('ipublic.ntipa-angular', [])
.factory('Oauth2Service', ['$rootScope', '$http', 'authService', 'Session', 'Account',  '$log', 'localStorageService','Ente','$location','$base64',
	function ($rootScope, $http, authService, Session, Account,$log, localStorageService, Ente,$location,$base64) {
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


		function recursiveVociTitolario(nodes,titolarioName,titolarioId){

			angular.forEach(nodes, function(nodo) {
				nodo.titolarioId = titolarioId;
				nodo.titolarioName = titolarioName ;

				var idVoce = nodo.titolarioId+"|"+nodo.id;

                nodo.idVoce = idVoce ;

                $rootScope.titolari.push(nodo);

                recursiveVociTitolario(nodo.nodes,nodo.titolarioName , titolarioId);
            });
		}

		function recursiveStruttura(struttura,paths){
			$log.debug('struttura:'+struttura);
			paths = paths + ' ' +struttura.name;

			angular.forEach(struttura.categorie, function(categoria) {
				$rootScope.categorias.push(categoria);
			});

			angular.forEach(struttura.titolari, function(titolario) {
				titolario.nodes = angular.fromJson(titolario.voci);
				titolario.voci = null;

				recursiveVociTitolario(titolario.nodes,titolario.name,titolario.id);

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
				Account.get(function(data) {


					$rootScope.account = data;
					localStorageService.add(keySession, data);
					$log.debug('data.enteId:'+data.enteId);

					if(data.enteId !== null && data.enteId !== 'null' ){
						Ente.organigramma({enteId:data.enteId},function(data){
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

						});
}

Ente.enties(function(data){
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


			$log.info('getLocaluser:' );
			$log.info($rootScope.account);
		}else{
			$location.path('/login').replace();
		}

	}
},clear: function () {
	$rootScope.authenticationError = false;
	$rootScope.authenticationError = false;
	$rootScope.authenticated = false;

	$log.info('clear');
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


	Session.invalidate();

	delete $http.defaults.headers.common[keyAuthorization];


}



};
}]);


angular.module('ipublic.ntipa-angular', [])
.factory('AuthenticationSharedService', ['$rootScope', '$http', 'authService', 'Session', 'Account',  '$log', 'localStorageService','Ente','Oauth2Service',
	function ($rootScope, $http, authService, Session, Account,$log, localStorageService, Ente, Oauth2Service) {
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
				var data = "grant_type=password&client_id=box&scope=read&username="+  param.username +"&password="+  param.password ;
				$log.info('data:' + data);
				Oauth2Service.clear();
				$http.post('/authserver/oauth/token', data, {
					headers: {
						"Content-Type": "application/x-www-form-urlencoded"
					},
					ignoreAuthModule: 'ignoreAuthModule'
				}).success(function (data, status, headers, config) {
					$rootScope.authenticationError = false;
					$rootScope.accessToken = data.access_token;
					var token = 'Bearer ' + $rootScope.accessToken;
					$log.info('Authorization:' + token);
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

				$http.get('/authserver/oauth/users/change/roles/'+data )
				.success(function (data, status, headers, config) {
					Oauth2Service.loadAccount();
				}).error(function (data, status, headers, config) {
					$rootScope.authenticationError = true;
                    //Session.invalidate();
                });
			},
			valid: function (authorizedRoles) {
				$log.info('on valid authorizedRoles'+authorizedRoles);

				$http.get('/box/protected/transparent.gif', {
					ignoreAuthModule: 'ignoreAuthModule'
				}).success(function (data, status, headers, config) {
					if (!!Session.login) {
						Account.get(function(data) {
							Session.create(data.login, data.firstName, data.lastName, data.email, data.roles);
							$rootScope.account = data;

							if (!$rootScope.isAuthorized(authorizedRoles)) {
								event.preventDefault();
                                // user is not allowed
                                $rootScope.$broadcast("event:auth-notAuthorized");
                            }

                            $rootScope.authenticated = true;
                        });
					}
					$rootScope.authenticated = !!Session.login;
				}).error(function (data, status, headers, config) {
					$rootScope.authenticated = false;
				});
			},
			isAuthorized: function (authorizedRoles) {
        // $log.info('on isAuthorized authorizedRoles'+authorizedRoles);
         //$log.info(Session.userRoles);

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
		$rootScope.authenticationError = false;
		$rootScope.authenticated = false;
		$rootScope.account = null;
		$rootScope.user = null;
		localStorageService.remove(keyAuthorization);
		localStorageService.remove(keyAccessToken);
		localStorageService.remove(keySession);
		delete $http.defaults.headers.common[keyAuthorization];
		$rootScope.token = '';
		$rootScope.accessToken = '';
		$http.get('/box/app/logout');
		Oauth2Service.clear();
		authService.loginCancelled();

     },
     loadLocalToken: function() {
		Oauth2Service.loadLocalToken();
     }
 };
}]);