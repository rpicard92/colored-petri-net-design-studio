"""
This is where the implementation of the plugin code goes.
The AllPossible-class is imported from both run_plugin.py and run_debug.py
"""
import sys
import logging
import random
import copy
import json
from webgme_bindings import PluginBase


execute_node=False
try:
    from Naked.toolshed.shell import execute_js, muterun_js
    execute_node=True
except:
    execute_node=False
    
# Setup a logger
logger = logging.getLogger('AllPossible')
logger.setLevel(logging.INFO)
handler = logging.StreamHandler(sys.stdout)  # By default it logs to stderr..
handler.setLevel(logging.INFO)
formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
handler.setFormatter(formatter)
logger.addHandler(handler)




class AllPossible(PluginBase):
    def main(self):
        core = self.core
        root_node = self.root_node
        active_node = self.active_node



        states=[]# a list of cur_state
        base_svg=[]
        cur_state={}#tells us the number of tokens in each place.
        path_to_name={}
        transitions={}#a dict. key is the path to the transition. value is a [A, B, C], where A is the threshold, B is a list of pairs (D, E) where D is a place and E is a cap, and C is a list of pairs (F, G) where F is a place and G is a weight.
        #here cap and weight are taken to be dicts created by string to dict
        def string_to_dict(input_string):
            dict_ret={}
            if input_string=='':
                return dict_ret
            str_ar=input_string.split(';')
            for entry in str_ar:
                dict_ret[entry.split(':')[0]]=int(entry.split(':')[1])
            return dict_ret
    
        def dict_add_cap(dict1, dict2, cap):
            for i in dict2:
                if i in cap:
                    if i in dict1:
                        dict1[i]=min(dict1[i]+dict2[i], cap[i]) 
                    else:
                        dict1[i]=min(dict2[i], cap[i])
                else:
                    if i in dict1:
                        dict1[i]=dict1[i]+dict2[i], 
                    else:
                        dict1[i]=dict2[i]
                        
        def dict_add_no_cap(dict1, dict2):
            for i in dict2:
                if i in dict1:
                    dict1[i]=dict1[i]+dict2[i] 
                else:
                    dict1[i]=dict2[i]
                    
        def dict_sub(dict1, cap):
            keys=dict1.keys
            to_delete=[]
            for i in dict1:
                if i in cap:
                    dict1[i]=dict1[i]-cap[i]
                    if dict1[i]<1:
                        to_delete.append(i)
                        #del dict1[i]
                else:
                    to_delete.append(i)
                    #del dict1[i]
            for i in to_delete:
                del dict1[i]
                        
        def per_thing(node):
            if core.is_meta_node(node):
                return
            
            try:
                dst_node=core.load_pointer(node, 'dst')
                src_node=core.load_pointer(node, 'src')
                dst_path=core.get_path(dst_node)
                src_path=core.get_path(src_node)
                meta_tr=core.get_meta_type(node)
                if core.get_attribute(meta_tr, 'name')=='PlaceToTransition':
                    #check if thing is enabled
                    thresh=core.get_attribute(dst_node, 'Tokens')
                    #tokens=core.get_attribute(src_node, 'Tokens')
                    cap=core.get_attribute(node, 'Tokens')
                    if dst_path in transitions:
                        transitions[dst_path][1].append((src_path, string_to_dict(cap)))
                    else:
                        transitions[dst_path]=[string_to_dict(thresh), [(src_path, string_to_dict(cap))], []]
            
                else:
                    try:
                        weight=core.get_attribute(node, 'Tokens')
                        thresh=core.get_attribute(src_node, 'Tokens')
                        if src_path in transitions:
                            transitions[src_path][2].append((dst_path, string_to_dict(weight)))
                        else:
                            transitions[src_path]=[string_to_dict(thresh),[], [(dst_path, string_to_dict(weight))]]
                    except Exception as e:
                        logger.info(core.get_path(node))
                        logger.info(e)
            except Exception as e:
                logger.info(core.get_path(node))
                logger.info(e)
                logger.info('NOT A POINTER NODE THINGY')
                meta_tr=core.get_meta_type(node)
                if core.get_attribute(meta_tr, 'name')=='Place':
                    cur_state[core.get_path(node)]=string_to_dict(core.get_attribute(node, 'Tokens'))
                    path_to_name[core.get_path(node)]=core.get_attribute(node, 'name')
                    if len(base_svg)==0:
                        base_svg.append(core.get_registry(node, 'SVGIcon'))
                        #base_svg=core.get_registry(node, 'SVGIcon')

        # set attribute value on the network
        def set_init_state(node, state_space):
            name = core.get_attribute(node, 'name')
            if(name == 'Network'):
                core.set_attribute(node, 'StateSpace', state_space)
            else:
                logger.info('[INFO]: Not Network node')

        max_iter=core.get_attribute(active_node, 'Iteration')
        ejs_string="<html><head><meta http-equiv='Content-Type' content='text/html; charset=UTF-8'></head><body style=''>    <% var tokens=''; %> <% function getAttribute(bweh) { return tokens;} %>"
        self.util.traverse(active_node, per_thing)
        #logger.info(transitions)
        states.append(cur_state)
        index=0
        for count in range(max_iter):
            for place in cur_state:
                ejs_string+="<%tokens='"
                colors=[]
                for color in cur_state[place]:
                    colors.append(color+':'+str(cur_state[place][color]))
                ejs_string+=(";".join(colors)+"';%>")
                ejs_string+=path_to_name[place]
                ejs_string+=base_svg[0]
            ejs_string+="<br/>"
                
            enabled=[]
            for tran in transitions:
                thresh=transitions[tran][0]
                list_of_caps=transitions[tran][1]
                contribution={}
                for place, cap in list_of_caps:
                    dict_add_cap(contribution, cur_state[place], cap)
                #logger.info(contribution)
                #logger.info('break')
                #logger.info(thresh)
                add_this=True
                for color in thresh:
                    if color in contribution:
                        if (contribution[color]<thresh[color] and thresh[color]>0) or (contribution[color]>= (-1)*thresh[color] and thresh[color]<0):
                            add_this=False
                            break#either we didn't have enough to meet the threshold, or we had too much
                        #else this requirement is satisfied
                    elif thresh[color]>0:
                        add_this=False
                        break#we had no contribution, and we needed some.
                if add_this:
                    enabled.append(tran)
                
            #logger.info(enabled)
            for tran in enabled:
                to_drain=transitions[tran][1]
                to_feed=transitions[tran][2]
                
                new_state=copy.deepcopy(cur_state)
                
                for place, drain in to_drain:
                    dict_sub(new_state[place], drain)
                for place, feed in to_feed:
                    dict_add_no_cap(new_state[place], feed)
                if new_state not in states:
                    states.append(new_state)
            index=index+1
            if index>=len(states):
                break
            cur_state=states[index]

        state_space = []
        #logger.info(states)
        for s in states:
            logger.info(s)
            state_space.append(str(s))

        set_init_state(active_node,str(state_space))

        
        #ejs_string="<html><head><meta http-equiv='Content-Type' content='text/html; charset=UTF-8'></head><body style=''>    <% var tokens=''; %> <% function getAttribute(bweh) { return tokens;} %>"
        #ejs_string+=base_svg[0]
        ejs_string+="</body></html>"
        if execute_node:
            with open('./src/plugins/AllPossible/AllPossible/kk_bweh.ejs', 'w') as fil:
                fil.write(ejs_string)
            bweh=muterun_js('./src/plugins/AllPossible/AllPossible/ejs_compile.js', '/kk_bweh.ejs')
            logger.info('uh....hello?')
            logger.info(bweh.exitcode)
            logger.info(bweh.stderr)
            logger.info(bweh.stdout)
            file_hash=self.add_file('trace.html', bweh.stdout.decode('utf-8'))
        else:
            file_hash=self.add_file('trace.ejs', ejs_string)
        logger.info('ejs file is stored under hash: {0}'.format(file_hash))
        commit_info = self.util.save(root_node, self.commit_hash, 'master', 'Python plugin updated the model')
        logger.info('wrote change')
        
